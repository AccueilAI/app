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
  Img,
  Tailwind,
  pixelBasedPreset,
} from '@react-email/components';

interface WaitlistWelcomeProps {
  language?: 'en' | 'fr' | 'ko';
}

const copy = {
  en: {
    preview: "You're on the AccueilAI waitlist!",
    badge: 'WAITLIST CONFIRMED',
    heading: "You're in!",
    body: "We're building an AI-powered assistant to help expats navigate French bureaucracy — visas, CAF, taxes, healthcare — in your language.",
    whatNext: "What happens next?",
    steps: [
      'We\'re building fast. Early access is coming soon.',
      'You\'ll be the first to know when we launch.',
      'First 100 members lock in exclusive launch pricing.',
    ],
    cta: 'Visit AccueilAI',
    footer:
      'AccueilAI · AI-powered admin assistant for expats in France',
    unsubscribe: 'You received this because you joined the waitlist.',
  },
  fr: {
    preview: "Vous êtes sur la liste d'attente AccueilAI !",
    badge: "INSCRIPTION CONFIRMÉE",
    heading: 'Vous êtes inscrit !',
    body: "Nous développons un assistant IA pour aider les expatriés à naviguer dans l'administration française — visa, CAF, impôts, santé — dans votre langue.",
    whatNext: 'Et ensuite ?',
    steps: [
      "Nous avançons vite. L'accès anticipé arrive bientôt.",
      'Vous serez les premiers informés du lancement.',
      'Les 100 premiers inscrits bénéficient du tarif de lancement.',
    ],
    cta: 'Visiter AccueilAI',
    footer:
      'AccueilAI · Assistant administratif IA pour les expatriés en France',
    unsubscribe:
      "Vous recevez cet email car vous vous êtes inscrit sur la liste d'attente.",
  },
  ko: {
    preview: 'AccueilAI 대기자 명단에 등록되었습니다!',
    badge: '등록 완료',
    heading: '등록되었습니다!',
    body: '프랑스 행정을 도와주는 AI 어시스턴트를 만들고 있습니다 — 비자, CAF, 세금, 의료보험 — 한국어로 안내합니다.',
    whatNext: '앞으로 어떻게 되나요?',
    steps: [
      '빠르게 개발 중입니다. 곧 얼리 엑세스가 열립니다.',
      '출시 시 가장 먼저 알려드립니다.',
      '선착순 100명에게 출시 특별가가 적용됩니다.',
    ],
    cta: 'AccueilAI 방문하기',
    footer: 'AccueilAI · 프랑스 거주 외국인을 위한 AI 행정 어시스턴트',
    unsubscribe: '대기자 명단 등록으로 이 이메일을 받으셨습니다.',
  },
};

export default function WaitlistWelcome({
  language = 'en',
}: WaitlistWelcomeProps) {
  const t = copy[language] ?? copy.en;

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
          <Preview>{t.preview}</Preview>

          <Container className="mx-auto max-w-xl py-10">
            {/* Tricolor accent */}
            <Section>
              <table width="100%" cellPadding={0} cellSpacing={0}>
                <tbody>
                  <tr>
                    <td style={{ height: 3, backgroundColor: '#002395', width: '33.33%' }} />
                    <td style={{ height: 3, backgroundColor: '#FFFFFF', width: '33.33%' }} />
                    <td style={{ height: 3, backgroundColor: '#ED2939', width: '33.34%' }} />
                  </tr>
                </tbody>
              </table>
            </Section>

            {/* Main card */}
            <Section className="rounded-b-lg bg-white px-10 py-8">
              {/* Logo area */}
              <Heading className="m-0 text-center text-2xl font-bold tracking-tight text-brand">
                AccueilAI
              </Heading>

              <Text className="mt-2 text-center text-xs font-semibold uppercase tracking-widest text-accent">
                {t.badge}
              </Text>

              <Hr className="my-6 border-solid border-gray-200" />

              {/* Main heading */}
              <Heading
                as="h2"
                className="m-0 text-center text-3xl font-bold text-gray-900"
              >
                {t.heading}
              </Heading>

              {/* Body text */}
              <Text className="mt-6 text-base leading-relaxed text-gray-600">
                {t.body}
              </Text>

              <Hr className="my-6 border-solid border-gray-200" />

              {/* What's next */}
              <Heading
                as="h3"
                className="m-0 text-lg font-semibold text-gray-900"
              >
                {t.whatNext}
              </Heading>

              {t.steps.map((step, i) => (
                <Text
                  key={i}
                  className="my-2 text-base leading-relaxed text-gray-600"
                >
                  {i + 1}. {step}
                </Text>
              ))}

              {/* CTA */}
              <Section className="mt-8 text-center">
                <Button
                  href="https://accueil.ai"
                  className="box-border rounded-lg bg-brand px-8 py-3 text-center text-base font-semibold text-white no-underline"
                >
                  {t.cta}
                </Button>
              </Section>
            </Section>

            {/* Footer */}
            <Section className="mt-8 text-center">
              <Text className="m-0 text-xs text-gray-400">
                {t.footer}
              </Text>
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

WaitlistWelcome.PreviewProps = {
  language: 'en',
} satisfies WaitlistWelcomeProps;
