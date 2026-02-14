import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { Navbar } from '@/components/landing/Navbar';
import { DeadlinesContent } from './DeadlinesContent';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Deadlines' });

  return {
    title: `${t('pageTitle')} — AccueilAI`,
    description: t('pageSubtitle'),
  };
}

export default async function DeadlinesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <Navbar />
      <DeadlinesContent />
    </>
  );
}
