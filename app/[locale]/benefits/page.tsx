import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { Navbar } from '@/components/landing/Navbar';
import { BenefitsContent } from './BenefitsContent';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Benefits' });

  return {
    title: `${t('pageTitle')} — AccueilAI`,
    description: t('pageSubtitle'),
  };
}

export default async function BenefitsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <Navbar />
      <BenefitsContent locale={locale} />
    </>
  );
}
