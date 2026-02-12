import { setRequestLocale } from 'next-intl/server';
import { Navbar } from '@/components/landing/Navbar';
import { Hero } from '@/components/landing/Hero';

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
      </main>
    </>
  );
}
