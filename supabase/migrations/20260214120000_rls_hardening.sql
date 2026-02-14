-- =============================================================================
-- RLS Hardening: Defense-in-Depth for All Tables
-- =============================================================================
--
-- Context:
--   All tables have RLS enabled but no explicit policies. The application uses
--   only the service_role key (which bypasses RLS) from Next.js API routes.
--   No client-side Supabase access exists (no anon key in NEXT_PUBLIC_*).
--
-- This migration adds two layers of protection:
--   1. REVOKE direct table privileges from anon/authenticated roles
--   2. Add explicit RLS policies that deny all access except via service_role
--
-- Why both layers?
--   - REVOKE prevents PostgREST from even attempting queries on these tables
--   - RLS policies document intent and survive accidental GRANT additions
--   - service_role bypasses both layers, so API routes are unaffected
--
-- =============================================================================

-- =============================================================================
-- Layer 1: Revoke all direct table privileges from public roles
-- =============================================================================
-- The "public" role is inherited by both "anon" and "authenticated" roles.
-- Revoking from "public" covers all non-superuser/non-service_role access.

-- document_chunks: read-only via RPC (hybrid_search, vector_search)
REVOKE ALL ON TABLE document_chunks FROM public;
REVOKE ALL ON TABLE document_chunks FROM anon;
REVOKE ALL ON TABLE document_chunks FROM authenticated;

-- government_offices: read-only via service_role queries
REVOKE ALL ON TABLE government_offices FROM public;
REVOKE ALL ON TABLE government_offices FROM anon;
REVOKE ALL ON TABLE government_offices FROM authenticated;

-- waitlist: insert-only via API route
REVOKE ALL ON TABLE waitlist FROM public;
REVOKE ALL ON TABLE waitlist FROM anon;
REVOKE ALL ON TABLE waitlist FROM authenticated;

-- chat_logs: insert-only via API route
REVOKE ALL ON TABLE chat_logs FROM public;
REVOKE ALL ON TABLE chat_logs FROM anon;
REVOKE ALL ON TABLE chat_logs FROM authenticated;

-- chat_feedback: insert-only via API route
REVOKE ALL ON TABLE chat_feedback FROM public;
REVOKE ALL ON TABLE chat_feedback FROM anon;
REVOKE ALL ON TABLE chat_feedback FROM authenticated;

-- =============================================================================
-- Layer 2: Explicit RLS policies (deny-all for anon/authenticated)
-- =============================================================================
-- These policies use "USING (false)" which means no rows are ever visible.
-- Even if someone re-grants table access, RLS still blocks all rows.
--
-- Note: service_role bypasses RLS entirely, so these do not affect API routes.
-- Note: We create SELECT-only policies because that is the operation anon/
--       authenticated would attempt. INSERT/UPDATE/DELETE are also blocked
--       by the REVOKE above, and RLS default-deny covers them without policies.

-- document_chunks: deny all reads to anon
CREATE POLICY "Deny anon read access to document_chunks"
  ON document_chunks
  FOR SELECT
  TO anon
  USING (false);

-- document_chunks: deny all reads to authenticated (no user auth yet)
CREATE POLICY "Deny authenticated read access to document_chunks"
  ON document_chunks
  FOR SELECT
  TO authenticated
  USING (false);

-- government_offices: deny all reads to anon
CREATE POLICY "Deny anon read access to government_offices"
  ON government_offices
  FOR SELECT
  TO anon
  USING (false);

-- government_offices: deny all reads to authenticated
CREATE POLICY "Deny authenticated read access to government_offices"
  ON government_offices
  FOR SELECT
  TO authenticated
  USING (false);

-- waitlist: deny all operations to anon
CREATE POLICY "Deny anon access to waitlist"
  ON waitlist
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- waitlist: deny all operations to authenticated
CREATE POLICY "Deny authenticated access to waitlist"
  ON waitlist
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- chat_logs: deny all operations to anon
CREATE POLICY "Deny anon access to chat_logs"
  ON chat_logs
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- chat_logs: deny all operations to authenticated
CREATE POLICY "Deny authenticated access to chat_logs"
  ON chat_logs
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- chat_feedback: deny all operations to anon
CREATE POLICY "Deny anon access to chat_feedback"
  ON chat_feedback
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- chat_feedback: deny all operations to authenticated
CREATE POLICY "Deny authenticated access to chat_feedback"
  ON chat_feedback
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- =============================================================================
-- Layer 3: Revoke sequence usage (prevents anon from discovering row counts)
-- =============================================================================

-- waitlist uses bigint generated always as identity, which creates a sequence
DO $$
DECLARE
  seq_name TEXT;
BEGIN
  -- Find the sequence backing the waitlist.id column
  SELECT pg_get_serial_sequence('waitlist', 'id') INTO seq_name;
  IF seq_name IS NOT NULL THEN
    EXECUTE format('REVOKE ALL ON SEQUENCE %s FROM public', seq_name);
    EXECUTE format('REVOKE ALL ON SEQUENCE %s FROM anon', seq_name);
    EXECUTE format('REVOKE ALL ON SEQUENCE %s FROM authenticated', seq_name);
  END IF;
END $$;

-- =============================================================================
-- Verification query (run manually to confirm policies are in place)
-- =============================================================================
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;
