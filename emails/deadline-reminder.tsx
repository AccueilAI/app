import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Heading,
  Text,
  Button,
  Hr,
  Tailwind,
  pixelBasedPreset,
} from '@react-email/components';

interface DeadlineReminderProps {
  deadlineName: string;
  deadlineDate: string;
  daysLeft: number;
  language?: 'en' | 'fr' | 'ko';
}

const copy = {
  en: {
    preview: (name: string) => `Reminder: ${name} is coming up`,
    heading: 'Deadline Reminder',
    body: (name: string, date: string, days: number) =>
      days === 0
        ? `Your deadline "${name}" is due today (${date}).`
        : `Your deadline "${name}" is due in ${days} day${days === 1 ? '' : 's'} (${date}).`,
    action: "Don't miss it — review your deadline and prepare what you need.",
    cta: 'View Your Deadlines',
    footer: 'AccueilAI · AI-powered admin assistant for expats in France',
    unsubscribe:
      'You received this because you set a deadline reminder on AccueilAI.',
  },
  fr: {
    preview: (name: string) => `Rappel : ${name} approche`,
    heading: "Rappel d'échéance",
    body: (name: string, date: string, days: number) =>
      days === 0
        ? `Votre échéance « ${name} » arrive aujourd'hui (${date}).`
        : `Votre échéance « ${name} » arrive dans ${days} jour${days === 1 ? '' : 's'} (${date}).`,
    action:
      "Ne la manquez pas — consultez votre échéance et préparez ce qu'il faut.",
    cta: 'Voir mes échéances',
    footer:
      'AccueilAI · Assistant administratif IA pour les expatriés en France',
    unsubscribe:
      "Vous recevez cet email car vous avez activé un rappel d'échéance sur AccueilAI.",
  },
  ko: {
    preview: (name: string) => `알림: ${name} 마감일이 다가옵니다`,
    heading: '기한 알림',
    body: (name: string, date: string, days: number) =>
      days === 0
        ? `"${name}" 기한이 오늘입니다 (${date}).`
        : `"${name}" 기한이 ${days}일 남았습니다 (${date}).`,
    action: '놓치지 마세요 — 기한을 확인하고 필요한 서류를 준비하세요.',
    cta: '기한 확인하기',
    footer: 'AccueilAI · 프랑스 거주 외국인을 위한 AI 행정 어시스턴트',
    unsubscribe:
      'AccueilAI에서 기한 알림을 설정하셨기 때문에 이 이메일을 받으셨습니다.',
  },
};

export default function DeadlineReminder({
  deadlineName,
  deadlineDate,
  daysLeft,
  language = 'en',
}: DeadlineReminderProps) {
  const t = copy[language] ?? copy.en;
  const locale = language === 'fr' ? 'fr' : language === 'ko' ? 'ko' : 'en';

  return (
    <Html lang={language}>
      <Tailwind
        config={{
          presets: [pixelBasedPreset],
          theme: {
            extend: {
              colors: {
                brand: '#2B4C8C',
                'brand-dark': '#1E3A6E',
                accent: '#ED2939',
                surface: '#FAFAF8',
              },
            },
          },
        }}
      >
        <Head />
        <Body className="bg-surface font-sans">
          <Preview>{t.preview(deadlineName)}</Preview>

          <Container className="mx-auto max-w-xl py-10">
            {/* Tricolor accent */}
            <Section>
              <table width="100%" cellPadding={0} cellSpacing={0}>
                <tbody>
                  <tr>
                    <td
                      style={{
                        height: 3,
                        backgroundColor: '#002395',
                        width: '33.33%',
                      }}
                    />
                    <td
                      style={{
                        height: 3,
                        backgroundColor: '#FFFFFF',
                        width: '33.33%',
                      }}
                    />
                    <td
                      style={{
                        height: 3,
                        backgroundColor: '#ED2939',
                        width: '33.34%',
                      }}
                    />
                  </tr>
                </tbody>
              </table>
            </Section>

            {/* Main card */}
            <Section className="rounded-b-lg bg-white px-10 py-8">
              <Heading className="m-0 text-center text-2xl font-bold tracking-tight text-brand">
                AccueilAI
              </Heading>

              <Text className="mt-2 text-center text-xs font-semibold uppercase tracking-widest text-accent">
                {daysLeft === 0 ? '⚠️' : '🔔'}{' '}
                {t.heading}
              </Text>

              <Hr className="my-6 border-solid border-gray-200" />

              <Heading
                as="h2"
                className="m-0 text-center text-3xl font-bold text-gray-900"
              >
                {deadlineName}
              </Heading>

              <Section className="mt-4 text-center">
                <Text
                  className={`m-0 inline-block rounded-full px-6 py-2 text-base font-bold text-white ${
                    daysLeft === 0 ? 'bg-accent' : 'bg-brand'
                  }`}
                >
                  {t.body(deadlineName, deadlineDate, daysLeft)}
                </Text>
              </Section>

              <Text className="mt-6 text-base leading-relaxed text-gray-600">
                {t.action}
              </Text>

              <Section className="mt-8 text-center">
                <Button
                  href={`https://accueil.ai/${locale}/deadlines`}
                  className="box-border rounded-lg bg-brand px-8 py-3 text-center text-base font-semibold text-white no-underline"
                >
                  {t.cta}
                </Button>
              </Section>
            </Section>

            {/* Footer */}
            <Section className="mt-8 text-center">
              <Text className="m-0 text-xs text-gray-400">{t.footer}</Text>
              <Text className="mt-1 text-xs text-gray-400">
                {t.unsubscribe}
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

DeadlineReminder.PreviewProps = {
  deadlineName: 'Visa Renewal',
  deadlineDate: 'March 15, 2026',
  daysLeft: 7,
  language: 'en',
} satisfies DeadlineReminderProps;
