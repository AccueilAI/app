-- Benefit update schedules: track expected annual update months
CREATE TABLE benefit_update_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  benefit_id UUID REFERENCES benefits(id),
  expected_update_month INTEGER NOT NULL CHECK (expected_update_month BETWEEN 1 AND 12),
  description TEXT,
  last_checked_at TIMESTAMPTZ
);

CREATE INDEX idx_benefit_schedule_month ON benefit_update_schedule (expected_update_month);

ALTER TABLE benefit_update_schedule ENABLE ROW LEVEL SECURITY;
