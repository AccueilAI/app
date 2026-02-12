import { useTranslations } from 'next-intl';

export function Footer() {
  const t = useTranslations('Footer');
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-neutral-200 bg-white py-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-start sm:justify-between">
          {/* Brand */}
          <div className="text-center sm:text-left">
            <a href="#" className="text-lg font-semibold tracking-tight">
              Accueil<span className="text-blue-600">AI</span>
            </a>
            <p className="mt-2 max-w-xs text-sm text-neutral-500">
              {t('tagline')}
            </p>
          </div>

          {/* Links */}
          <div className="flex gap-16 text-sm">
            <div>
              <p className="font-medium text-neutral-900">{t('product')}</p>
              <ul className="mt-3 space-y-2 text-neutral-500">
                <li>
                  <a href="#features" className="hover:text-neutral-900">
                    {t('features', { defaultValue: 'Features' })}
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="hover:text-neutral-900">
                    {t('pricing', { defaultValue: 'Pricing' })}
                  </a>
                </li>
                <li>
                  <a href="#faq" className="hover:text-neutral-900">
                    FAQ
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-neutral-900">{t('legal')}</p>
              <ul className="mt-3 space-y-2 text-neutral-500">
                <li>
                  <a href="#" className="hover:text-neutral-900">
                    {t('privacy_policy')}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-neutral-900">
                    {t('terms')}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-neutral-900">
                    {t('disclaimer')}
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col items-center gap-4 border-t border-neutral-100 pt-6">
          <div className="flex gap-2">
            <div className="h-0.5 w-8 rounded-full bg-blue-600" />
            <div className="h-0.5 w-8 rounded-full bg-white ring-1 ring-neutral-200" />
            <div className="h-0.5 w-8 rounded-full bg-red-500" />
          </div>
          <p className="text-xs text-neutral-400">
            &copy; {year} AccueilAI. {t('rights')}
          </p>
        </div>
      </div>
    </footer>
  );
}
