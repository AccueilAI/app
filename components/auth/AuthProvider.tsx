'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import type { User, SupabaseClient } from '@supabase/supabase-js';
import type { AuthContextType, UserProfile } from '@/lib/auth/types';

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  isLoading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabaseRef = useRef<SupabaseClient | null>(null);
  const router = useRouter();

  const getSupabase = useCallback(() => {
    if (supabaseRef.current) return supabaseRef.current;
    // Lazy-import to avoid SSG issues
    const { createClient } = require('@/lib/supabase/browser');
    supabaseRef.current = createClient() as SupabaseClient;
    return supabaseRef.current;
  }, []);

  const fetchProfile = useCallback(
    async (userId: string) => {
      const supabase = getSupabase();
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      setProfile(data as UserProfile | null);
    },
    [getSupabase],
  );

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!url || !anonKey) {
      // Auth not configured — skip initialization
      setIsLoading(false);
      return;
    }

    const supabase = getSupabase();

    // Get initial session
    supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
      setUser(currentUser);
      if (currentUser) {
        fetchProfile(currentUser.id);
      }
      setIsLoading(false);
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const newUser = session?.user ?? null;
      setUser(newUser);
      if (newUser) {
        fetchProfile(newUser.id);
        // After OAuth login, redirect to the stored return path
        if (event === 'SIGNED_IN') {
          try {
            const returnTo = localStorage.getItem('auth_return_to');
            if (returnTo && returnTo.startsWith('/')) {
              localStorage.removeItem('auth_return_to');
              router.push(returnTo);
            }
          } catch { /* ignore */ }
        }
      } else {
        setProfile(null);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [getSupabase, fetchProfile]);

  const signOut = useCallback(async () => {
    const supabase = getSupabase();
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }, [getSupabase]);

  return (
    <AuthContext.Provider value={{ user, profile, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
