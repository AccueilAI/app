'use client';

import { useState, useRef, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { Globe, ChevronDown, Sparkles, Users, FileSearch, CalendarClock, Gift, Layers, CreditCard, HelpCircle } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { LoginModal } from '@/components/auth/LoginModal';
import { UserMenu } from '@/components/auth/UserMenu';

const locales = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'fr', label: 'Fran\u00e7ais', short: 'FR' },
  { code: 'ko', label: '\ud55c\uad6d\uc5b4', short: 'KO' },
] as const;

// Logged-in: app pages
const AUTH_LINKS = [
  { key: 'chat', icon: Sparkles, primary: true },
  { key: 'experiences', icon: Users, primary: false },
  { key: 'documents', icon: FileSearch, primary: false },
  { key: 'deadlines', icon: CalendarClock, primary: false },
  { key: 'benefits', icon: Gift, primary: false },
] as const;

// Not logged-in: chat + landing section anchors
const ANON_LINKS = [
  { key: 'chat', icon: Sparkles, hash: null },
  { key: 'features', icon: Layers, hash: '#features' },
  { key: 'pricing', icon: CreditCard, hash: '#pricing' },
  { key: 'faq', icon: HelpCircle, hash: '#faq' },
] as const;

export function Navbar() {
  const t = useTranslations('Navbar');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [langOpen, setLangOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, isLoading } = useAuth();

  function switchLocale(newLocale: string) {
    const segments = pathname.split('/');
    segments[1] = newLocale;
    router.push(segments.join('/'));
    setLangOpen(false);
  }

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

  const isLanding = pathname === `/${locale}` || pathname === `/${locale}/`;
  const anchor = (hash: string) => (isLanding ? hash : `/${locale}/${hash}`);

  function isActive(key: string) {
    return pathname.startsWith(`/${locale}/${key}`);
  }

  return (
    <>
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

          {/* Desktop nav — auth-state based */}
          <div className="hidden items-center gap-7 md:flex">
            {user ? (
              /* Logged in: app pages */
              AUTH_LINKS.map((link) => {
                const Icon = link.icon;
                const active = !isLanding && isActive(link.key);
                return (
                  <a
                    key={link.key}
                    href={`/${locale}/${link.key}`}
                    className={`flex items-center gap-1.5 text-[15px] transition-colors ${
                      active
                        ? 'font-semibold text-[#2B4C8C]'
                        : link.primary
                          ? 'font-semibold text-[#2B4C8C] hover:text-[#1E3A6E]'
                          : 'font-medium text-[#5C5C6F] hover:text-[#1A1A2E]'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {t(link.key)}
                  </a>
                );
              })
            ) : (
              /* Not logged in: chat + landing anchors */
              <>
                <a
                  href={`/${locale}/chat`}
                  className={`flex items-center gap-1.5 text-[15px] font-semibold transition-colors ${
                    isActive('chat') ? 'text-[#2B4C8C]' : 'text-[#2B4C8C] hover:text-[#1E3A6E]'
                  }`}
                >
                  <Sparkles className="h-4 w-4" />
                  {t('chat')}
                </a>
                <a href={anchor('#features')} className="text-[15px] font-medium text-[#5C5C6F] transition-colors hover:text-[#1A1A2E]">
                  {t('features')}
                </a>
                <a href={anchor('#pricing')} className="text-[15px] font-medium text-[#5C5C6F] transition-colors hover:text-[#1A1A2E]">
                  {t('pricing')}
                </a>
                <a href={anchor('#faq')} className="text-[15px] font-medium text-[#5C5C6F] transition-colors hover:text-[#1A1A2E]">
                  {t('faq')}
                </a>
              </>
            )}
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

            {/* Auth: Login / UserMenu */}
            {!isLoading && (
              <>
                {user ? (
                  <UserMenu />
                ) : (
                  <button
                    onClick={() => setLoginOpen(true)}
                    className="whitespace-nowrap rounded-lg bg-[#2B4C8C] px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#1E3A6E] sm:px-5 sm:py-2.5 sm:text-sm"
                  >
                    {t('signIn')}
                  </button>
                )}
              </>
            )}
          </div>
        </nav>
      </header>

      {/* Mobile bottom tab bar — auth-state based */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#D6DDE8] bg-white/95 backdrop-blur-lg md:hidden">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-around px-2">
          {user ? (
            /* Logged in: app pages */
            AUTH_LINKS.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.key);
              return (
                <a
                  key={link.key}
                  href={`/${locale}/${link.key}`}
                  className={`flex flex-col items-center gap-0.5 px-3 py-1 ${
                    active
                      ? 'text-[#2B4C8C]'
                      : 'text-[#8E8E9A] transition-colors hover:text-[#5C5C6F]'
                  }`}
                >
                  <Icon className={`h-5 w-5 ${active ? 'stroke-[2.5]' : ''}`} />
                  <span className={`text-[10px] leading-tight ${active ? 'font-semibold' : 'font-medium'}`}>
                    {t(link.key)}
                  </span>
                </a>
              );
            })
          ) : (
            /* Not logged in: chat + landing anchors */
            ANON_LINKS.map((link) => {
              const Icon = link.icon;
              const href = link.hash ? anchor(link.hash) : `/${locale}/chat`;
              const active = !link.hash && isActive('chat');
              return (
                <a
                  key={link.key}
                  href={href}
                  className={`flex flex-col items-center gap-0.5 px-3 py-1 ${
                    active
                      ? 'text-[#2B4C8C]'
                      : 'text-[#8E8E9A] transition-colors hover:text-[#5C5C6F]'
                  }`}
                >
                  <Icon className={`h-5 w-5 ${active ? 'stroke-[2.5]' : ''}`} />
                  <span className={`text-[10px] leading-tight ${active ? 'font-semibold' : 'font-medium'}`}>
                    {t(link.key)}
                  </span>
                </a>
              );
            })
          )}
        </div>
      </nav>

      <LoginModal open={loginOpen} onOpenChange={setLoginOpen} />
    </>
  );
}
