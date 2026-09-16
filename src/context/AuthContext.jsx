import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function getInitialSession() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (mounted) {
          setSession(session);
          setUser(session?.user || null);
          if (import.meta.env.DEV) {
            console.log('AUTH USER ID:', session?.user?.id || null);
            console.log('AUTH EMAIL:', session?.user?.email || null);
          }
          if (session?.user) {
            await fetchProfile(session.user.id);
          } else {
            setLoading(false);
          }
        }
      } catch (error) {
        console.error('HomeIQ: Error getting session:', error.message);
        if (mounted) setLoading(false);
      }
    }

    getInitialSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;
        
        setSession(newSession);
        setUser(newSession?.user || null);
        if (import.meta.env.DEV) {
          console.log('AUTH USER ID:', newSession?.user?.id || null);
          console.log('AUTH EMAIL:', newSession?.user?.email || null);
        }

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (newSession?.user) {
            await fetchProfile(newSession.user.id);
          }
        } else if (event === 'SIGNED_OUT') {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function fetchProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, role, created_at')
        .eq('id', userId)
        .limit(2);

      if (error) {
        setProfile(null);
        console.error('HomeIQ: Error fetching profile:', error.message);
      } else if (!data || data.length === 0) {
        setProfile(null);
        if (import.meta.env.DEV) console.log('PROFILE:', null);
      } else if (data.length > 1) {
        console.error('HomeIQ: Multiple profiles found for the authenticated user.');
        setProfile(null);
      } else {
        setProfile(data[0]);
        if (import.meta.env.DEV) console.log('PROFILE:', data[0]);
      }
    } catch (err) {
      setProfile(null);
      console.error('HomeIQ: Profile fetch exception:', err);
    } finally {
      setLoading(false);
    }
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('HomeIQ: Error signing out:', error.message);
    }
  };

  const value = {
    session,
    user,
    profile,
    loading,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

