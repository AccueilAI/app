import type { User } from '@supabase/supabase-js';

export type SubscriptionTier = 'free' | 'plus' | 'pro' | 'max' | 'admin';

export const TIER_LIMITS = {
  free:  { dailyChat: 3,        dailyChecklist: 0,        dailyDocAnalysis: 0,        maxDeadlines: 0        },
  plus:  { dailyChat: 20,       dailyChecklist: 3,        dailyDocAnalysis: 3,        maxDeadlines: 0        },
  pro:   { dailyChat: Infinity, dailyChecklist: 10,       dailyDocAnalysis: 10,       maxDeadlines: 10       },
  max:   { dailyChat: Infinity, dailyChecklist: Infinity,  dailyDocAnalysis: Infinity,  maxDeadlines: Infinity },
  admin: { dailyChat: Infinity, dailyChecklist: Infinity,  dailyDocAnalysis: Infinity,  maxDeadlines: Infinity },
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
