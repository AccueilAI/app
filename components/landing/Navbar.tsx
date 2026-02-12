'use client';

import { useState, useRef, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { Globe, ChevronDown } from 'lucide-react';

const locales = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'fr', label: 'Fran\u00e7ais', short: 'FR' },
  { code: 'ko', label: '\ud55c\uad6d\uc5b4', short: 'KO' },
] as const;

export function Navbar() {
  const t = useTranslations('Navbar');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [langOpen, setLangOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  function switchLocale(newLocale: string) {
    const segments = pathname.split('/');
    segments[1] = newLocale;
    router.push(segments.join('/'));
    setLangOpen(false);
  }

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const currentLocale = locales.find((l) => l.code === locale);

  const navLinks = [
    { href: '#features', label: t('features') },
    { href: '#pricing', label: t('pricing') },
    { href: '#faq', label: t('faq') },
  ];

  return (
    <header className="fixed top-0 z-50 w-full border-b border-[#D6DDE8]/60 bg-[#EEF2F9]/75 backdrop-blur-lg">
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
          {/* Language dropdown */}
          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => setLangOpen(!langOpen)}
              className="flex items-center gap-1.5 rounded-full border border-[#E5E3DE] px-2.5 py-2 text-[13px] font-semibold text-[#5C5C6F] transition-colors hover:border-[#2B4C8C] hover:text-[#2B4C8C] sm:px-3.5"
            >
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">{currentLocale?.label}</span>
              <span className="sm:hidden">{currentLocale?.short}</span>
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${langOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {langOpen && (
              <div className="absolute right-0 top-full mt-2 min-w-[140px] overflow-hidden rounded-lg border border-[#E5E3DE] bg-white py-1 shadow-lg">
                {locales.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => switchLocale(l.code)}
                    className={`flex w-full items-center px-4 py-2.5 text-left text-sm transition-colors ${
                      locale === l.code
                        ? 'bg-[#EEF2F9] font-semibold text-[#2B4C8C]'
                        : 'text-[#5C5C6F] hover:bg-[#FAFAF8]'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* CTA */}
          <a
            href="#waitlist"
            className="whitespace-nowrap rounded-lg bg-[#2B4C8C] px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#1E3A6E] sm:px-5 sm:py-2.5 sm:text-sm"
          >
            {t('cta')}
          </a>
        </div>
      </nav>
    </header>
  );
}
