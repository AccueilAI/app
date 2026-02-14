-- Restrict RPC function access: only service_role can call search functions
-- Prevents direct data extraction via anon key

-- Revoke execute from public (includes anon and authenticated roles)
REVOKE EXECUTE ON FUNCTION hybrid_search FROM public;
REVOKE EXECUTE ON FUNCTION vector_search FROM public;

-- Grant only to service_role (used by API routes)
GRANT EXECUTE ON FUNCTION hybrid_search TO service_role;
GRANT EXECUTE ON FUNCTION vector_search TO service_role;
