import { setRequestLocale } from 'next-intl/server';
import { Navbar } from '@/components/landing/Navbar';
import { Hero } from '@/components/landing/Hero';
import { PainPoints } from '@/components/landing/PainPoints';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { Features } from '@/components/landing/Features';
import { Pricing } from '@/components/landing/Pricing';
import { WaitlistForm } from '@/components/landing/WaitlistForm';
import { FAQ } from '@/components/landing/FAQ';
import { Footer } from '@/components/landing/Footer';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function Home({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <PainPoints />
        <HowItWorks />
        <Features />
        <Pricing />
        <WaitlistForm />
        <FAQ />
      </main>
      <Footer />
    </>
  );
}
