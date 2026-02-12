import { useTranslations } from 'next-intl';

export function Footer() {
  const t = useTranslations('Footer');
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-neutral-200 bg-white py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 text-center sm:px-6">
        <a href="#" className="text-lg font-semibold tracking-tight">
          Accueil<span className="text-blue-600">AI</span>
        </a>
        <p className="max-w-md text-sm text-neutral-500">{t('tagline')}</p>
        <div className="flex gap-2">
          <div className="h-0.5 w-8 rounded-full bg-blue-600" />
          <div className="h-0.5 w-8 rounded-full bg-white ring-1 ring-neutral-200" />
          <div className="h-0.5 w-8 rounded-full bg-red-500" />
        </div>
        <p className="text-xs text-neutral-400">
          &copy; {year} AccueilAI. {t('rights')}
        </p>
      </div>
    </footer>
  );
}
