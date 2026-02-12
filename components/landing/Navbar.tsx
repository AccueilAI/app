'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';

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
        <a href={`/${locale}`} className="text-xl font-semibold tracking-tight">
          Accueil<span className="text-blue-600">AI</span>
        </a>

        <div className="hidden items-center gap-6 sm:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-neutral-500 transition-colors hover:text-neutral-900"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-lg border border-neutral-200 p-0.5">
            {Object.entries(localeLabels).map(([loc, label]) => (
              <button
                key={loc}
                onClick={() => switchLocale(loc)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  locale === loc
                    ? 'bg-neutral-900 text-white'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <Button size="sm" asChild>
            <a href="#waitlist">{t('cta')}</a>
          </Button>
        </div>
      </nav>
    </header>
  );
}
