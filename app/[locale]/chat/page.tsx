import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { Navbar } from '@/components/landing/Navbar';
import { ChatInterface } from '@/components/chat/ChatInterface';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Chat' });

  return {
    title: `${t('pageTitle')} — AccueilAI`,
    description: t('welcomeSub'),
  };
}

export default async function ChatPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <Navbar />
      <ChatInterface />
    </>
  );
}
