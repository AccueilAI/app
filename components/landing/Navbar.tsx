'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { Globe } from 'lucide-react';

const localeLabels: Record<string, string> = {
  en: 'EN',
  fr: 'FR',
  ko: 'KO',
};

export function Navbar() {
  const t = useTranslations('Navbar');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function switchLocale(newLocale: string) {
    const segments = pathname.split('/');
    segments[1] = newLocale;
    router.push(segments.join('/'));
  }

  const navLinks = [
    { href: '#features', label: t('features') },
    { href: '#pricing', label: t('pricing') },
    { href: '#faq', label: t('faq') },
  ];

  return (
    <header className="fixed top-0 z-50 w-full border-b border-neutral-200/60 bg-white/80 backdrop-blur-lg">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <a href={`/${locale}`} className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#2B4C8C]">
            <span className="font-serif text-lg text-white">A</span>
          </div>
          <span className="font-serif text-[22px] text-[#1A1A2E]">
            AccueilAI
          </span>
        </a>

        {/* Nav links */}
        <div className="hidden items-center gap-9 sm:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-[15px] font-medium text-[#5C5C6F] transition-colors hover:text-[#1A1A2E]"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Locale pill */}
          <button
            onClick={() => {
              const locales = Object.keys(localeLabels);
              const next = locales[(locales.indexOf(locale) + 1) % locales.length];
              switchLocale(next);
            }}
            className="flex items-center gap-1.5 rounded-full border border-[#E5E3DE] px-3.5 py-2 text-[13px] font-semibold text-[#5C5C6F] transition-colors hover:border-[#2B4C8C] hover:text-[#2B4C8C]"
          >
            <Globe className="h-4 w-4" />
            {localeLabels[locale]}
          </button>

          {/* CTA */}
          <a
            href="#waitlist"
            className="rounded-lg bg-[#2B4C8C] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1E3A6E]"
          >
            {t('cta')}
          </a>
        </div>
      </nav>
    </header>
  );
}
