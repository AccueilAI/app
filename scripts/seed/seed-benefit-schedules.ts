/**
 * Seed benefit update schedules with known annual update months.
 * Run: pnpm tsx scripts/seed/seed-benefit-schedules.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
config();

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
);

const SCHEDULES = [
  { slug: 'rsa', month: 4, description: 'April revalorisation annuelle' },
  { slug: 'aspa', month: 4, description: 'April revalorisation annuelle' },
  { slug: 'aah', month: 4, description: 'April revalorisation annuelle' },
  { slug: 'css', month: 4, description: 'April income threshold update' },
  { slug: 'pass-culture', month: 1, description: 'January program renewal' },
];

async function main() {
  console.log('[seed-schedules] Starting...');

  const { data: benefits } = await supabase
    .from('benefits')
    .select('id, slug');

  if (!benefits) {
    console.error('[seed-schedules] No benefits found');
    return;
  }

  const slugToId = new Map(benefits.map(b => [b.slug, b.id]));

  for (const schedule of SCHEDULES) {
    const benefitId = slugToId.get(schedule.slug);
    if (!benefitId) {
      console.warn(`[seed-schedules] Benefit "${schedule.slug}" not found, skipping`);
      continue;
    }

    const { error } = await supabase.from('benefit_update_schedule').upsert(
      {
        benefit_id: benefitId,
        expected_update_month: schedule.month,
        description: schedule.description,
      },
      { onConflict: 'benefit_id' },
    );

    if (error) {
      console.error(`[seed-schedules] Error for ${schedule.slug}:`, error);
    } else {
      console.log(`[seed-schedules] ${schedule.slug}: month ${schedule.month}`);
    }
  }

  console.log('[seed-schedules] Done');
}

main().catch(console.error);
