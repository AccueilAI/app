-- Benefits catalog
CREATE TABLE benefits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('housing','healthcare','financial','employment','legal','education')),
  name_fr TEXT NOT NULL,
  name_en TEXT NOT NULL,
  name_ko TEXT NOT NULL,
  description_fr TEXT NOT NULL,
  description_en TEXT NOT NULL,
  description_ko TEXT NOT NULL,
  eligibility_rules JSONB NOT NULL DEFAULT '{}',
  how_to_apply JSONB NOT NULL DEFAULT '{}',
  official_url TEXT,
  estimated_amount TEXT,
  processing_time TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE benefits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active benefits" ON benefits
  FOR SELECT USING (is_active = true);

GRANT SELECT ON benefits TO anon, authenticated;

CREATE INDEX idx_benefits_category ON benefits(category);
CREATE INDEX idx_benefits_slug ON benefits(slug);

-- Benefit updates (news feed)
CREATE TABLE benefit_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL CHECK (source IN ('legifrance_rss','service_public_rss','manual')),
  title TEXT NOT NULL,
  summary_fr TEXT,
  summary_en TEXT,
  summary_ko TEXT,
  source_url TEXT NOT NULL UNIQUE,
  benefit_id UUID REFERENCES benefits(id) ON DELETE SET NULL,
  is_relevant BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE benefit_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read relevant updates" ON benefit_updates
  FOR SELECT USING (is_relevant = true);

GRANT SELECT ON benefit_updates TO anon, authenticated;

CREATE INDEX idx_benefit_updates_relevant ON benefit_updates(is_relevant, published_at DESC);
CREATE INDEX idx_benefit_updates_benefit ON benefit_updates(benefit_id);

-- Extend deadlines with stage tracking
ALTER TABLE deadlines ADD COLUMN IF NOT EXISTS stage TEXT DEFAULT 'preparing'
  CHECK (stage IN ('preparing','submitted','processing','decision','complete'));
ALTER TABLE deadlines ADD COLUMN IF NOT EXISTS stage_updated_at TIMESTAMPTZ DEFAULT now();
