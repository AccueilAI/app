'use client';

import { useLocale, useTranslations } from 'next-intl';
import { LogOut, User } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/components/auth/AuthProvider';

export function UserMenu() {
  const t = useTranslations('Auth');
  const locale = useLocale();
  const { user, profile, signOut } = useAuth();

  if (!user) return null;

  const displayName =
    profile?.display_name || user.user_metadata?.full_name || user.email;
  const avatarUrl = profile?.avatar_url || user.user_metadata?.avatar_url;
  const initials = (displayName || '?')
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-[#E5E3DE] transition-colors hover:border-[#2B4C8C]">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName || ''}
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="text-xs font-semibold text-[#2B4C8C]">
              {initials}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem asChild>
          <a
            href={`/${locale}/profile`}
            className="flex cursor-pointer items-center gap-2"
          >
            <User className="h-4 w-4" />
            {t('profile')}
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => signOut()}
          className="flex cursor-pointer items-center gap-2"
        >
          <LogOut className="h-4 w-4" />
          {t('signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
