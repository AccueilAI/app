import type { User } from '@supabase/supabase-js';

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
  created_at: string;
  updated_at: string;
}

export interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}
