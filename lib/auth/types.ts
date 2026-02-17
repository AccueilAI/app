import type { User } from '@supabase/supabase-js';

export type SubscriptionTier = 'free' | 'plus' | 'pro' | 'admin';

export const TIER_LIMITS = {
  free: { dailyChat: 5, dailyChecklist: 1, dailyDocAnalysis: 1 },
  plus: { dailyChat: Infinity, dailyChecklist: Infinity, dailyDocAnalysis: 5 },
  pro: { dailyChat: Infinity, dailyChecklist: Infinity, dailyDocAnalysis: Infinity },
  admin: { dailyChat: Infinity, dailyChecklist: Infinity, dailyDocAnalysis: Infinity },
} as const;

export interface UserProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  nationality: string | null;
  visa_type: string | null;
  arrival_date: string | null;
  prefecture: string | null;
  birth_date: string | null;
  has_children: boolean;
  employment_status: string;
  language: string;
  subscription_tier: SubscriptionTier;
  subscription_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  tier: SubscriptionTier;
  isLoading: boolean;
  signOut: () => Promise<void>;
}
