import { Resend } from 'resend';

interface BenefitReviewAlert {
  id: string;
  slug: string;
  name_fr: string;
  reason: string;
}

export async function notifyAdminBenefitReview(benefits: BenefitReviewAlert[]): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail || benefits.length === 0) return;

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.warn('[admin-notifier] RESEND_API_KEY not set, skipping email');
    return;
  }

  const resend = new Resend(resendKey);
  const benefitList = benefits
    .map(b => `- ${b.name_fr} (${b.slug}): ${b.reason}`)
    .join('\n');

  try {
    await resend.emails.send({
      from: 'AccueilAI <notifications@accueil.ai>',
      to: adminEmail,
      subject: `[AccueilAI] ${benefits.length} benefit(s) need review`,
      text: `The following benefits have been flagged for review:\n\n${benefitList}\n\nPlease verify the data is current and update if needed.\n\nhttps://accueil.ai/admin/benefits`,
    });
    console.log(`[admin-notifier] Sent review alert for ${benefits.length} benefits`);
  } catch (err) {
    console.error('[admin-notifier] Failed to send email:', err);
  }
}
