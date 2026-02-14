import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/client';
import { getResend } from '@/lib/resend';
import DeadlineReminder from '@/emails/deadline-reminder';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();

  const today = new Date().toISOString().split('T')[0];

  // Fetch all incomplete deadlines with pending reminders, then filter in JS
  // (PostgREST can't do computed column comparisons like deadline_date - days_before_reminder)
  const { data: pendingDeadlines, error: queryError } = await supabase
    .from('deadlines')
    .select('id, user_id, title, deadline_date, days_before_reminder')
    .eq('completed', false)
    .eq('reminder_sent', false);

  if (queryError) {
    console.error('[cron/deadline-reminders] query error:', queryError);
    return NextResponse.json(
      { error: 'Failed to query deadlines.' },
      { status: 500 },
    );
  }

  // Filter: deadline_date - days_before_reminder <= today
  const todayDate = new Date(today);
  const dueForReminder = (pendingDeadlines ?? []).filter((d) => {
    const deadlineDate = new Date(d.deadline_date);
    const reminderDate = new Date(deadlineDate);
    reminderDate.setDate(reminderDate.getDate() - d.days_before_reminder);
    return reminderDate <= todayDate;
  });

  if (dueForReminder.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  // Get user emails from auth.users via profiles join
  const userIds = [...new Set(dueForReminder.map((d) => d.user_id))];
  const { data: users } = await supabase.auth.admin.listUsers();

  const emailMap = new Map<string, { email: string; language: string }>();
  if (users?.users) {
    // Also fetch profiles for language preference
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, language')
      .in('id', userIds);

    const langMap = new Map(
      (profiles ?? []).map((p) => [p.id, p.language ?? 'en']),
    );

    for (const u of users.users) {
      if (userIds.includes(u.id) && u.email) {
        emailMap.set(u.id, {
          email: u.email,
          language: langMap.get(u.id) ?? 'en',
        });
      }
    }
  }

  const resend = getResend();
  let sentCount = 0;
  const reminderIds: string[] = [];

  for (const deadline of dueForReminder) {
    const userInfo = emailMap.get(deadline.user_id);
    if (!userInfo) continue;

    const deadlineDate = new Date(deadline.deadline_date);
    const daysLeft = Math.ceil(
      (deadlineDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const lang = (
      ['en', 'fr', 'ko'].includes(userInfo.language)
        ? userInfo.language
        : 'en'
    ) as 'en' | 'fr' | 'ko';

    try {
      await resend.emails.send({
        from: 'AccueilAI <noreply@accueil.ai>',
        to: userInfo.email,
        subject:
          lang === 'fr'
            ? `Rappel : ${deadline.title}`
            : lang === 'ko'
              ? `알림: ${deadline.title}`
              : `Reminder: ${deadline.title}`,
        react: DeadlineReminder({
          deadlineName: deadline.title,
          deadlineDate: deadlineDate.toLocaleDateString(
            lang === 'fr' ? 'fr-FR' : lang === 'ko' ? 'ko-KR' : 'en-US',
            { year: 'numeric', month: 'long', day: 'numeric' },
          ),
          daysLeft: Math.max(0, daysLeft),
          language: lang,
        }),
      });

      reminderIds.push(deadline.id);
      sentCount++;
    } catch (err) {
      console.error(
        `[cron/deadline-reminders] email error for ${deadline.id}:`,
        err,
      );
    }
  }

  // Mark reminders as sent
  if (reminderIds.length > 0) {
    await supabase
      .from('deadlines')
      .update({ reminder_sent: true })
      .in('id', reminderIds);
  }

  return NextResponse.json({ sent: sentCount });
}
