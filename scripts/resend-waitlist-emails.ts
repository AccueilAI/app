/**
 * Resend welcome emails to all waitlist members.
 *
 * Usage:
 *   pnpm tsx scripts/resend-waitlist-emails.ts              # Dry run (shows who would receive)
 *   pnpm tsx scripts/resend-waitlist-emails.ts --send       # Actually send emails
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
config();

import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';
import WaitlistWelcome from '../emails/waitlist-welcome';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
);

const resend = new Resend(process.env.RESEND_API_KEY?.replace(/\s+/g, ''));

const subjects = {
  en: 'Welcome to the AccueilAI waitlist!',
  fr: "Bienvenue sur la liste d'attente AccueilAI !",
  ko: 'AccueilAI 대기자 명단에 등록되었습니다!',
};

async function main() {
  const dryRun = !process.argv.includes('--send');

  const { data: members, error } = await supabase
    .from('waitlist')
    .select('email, language, created_at')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to fetch waitlist:', error);
    process.exit(1);
  }

  if (!members || members.length === 0) {
    console.log('No waitlist members found.');
    return;
  }

  console.log(`Found ${members.length} waitlist members.\n`);

  if (dryRun) {
    console.log('DRY RUN — no emails will be sent. Use --send to send.\n');
    for (const m of members) {
      const lang = (m.language ?? 'en') as 'en' | 'fr' | 'ko';
      console.log(`  ${m.email} (${lang}) — registered ${m.created_at}`);
    }
    console.log(`\nTotal: ${members.length}`);
    return;
  }

  let sent = 0;
  let failed = 0;

  for (const m of members) {
    const lang = (m.language ?? 'en') as 'en' | 'fr' | 'ko';
    try {
      const result = await resend.emails.send({
        from: 'AccueilAI <hello@accueil.ai>',
        to: m.email,
        subject: subjects[lang] ?? subjects.en,
        react: WaitlistWelcome({ language: lang }),
        headers: {
          'List-Unsubscribe': '<mailto:hello@accueil.ai?subject=unsubscribe>',
        },
      });

      if (result.error) {
        console.error(`  ✗ ${m.email}: ${result.error.message}`);
        failed++;
      } else {
        console.log(`  ✓ ${m.email} (${lang})`);
        sent++;
      }

      // Rate limit: Resend free tier = 2 emails/sec
      await new Promise((r) => setTimeout(r, 600));
    } catch (err) {
      console.error(`  ✗ ${m.email}:`, err);
      failed++;
    }
  }

  console.log(`\nDone. Sent: ${sent}, Failed: ${failed}`);
}

main();
