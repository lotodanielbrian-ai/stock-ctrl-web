import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { DEFAULT_DATA } from '../data/initialData';
import { STORAGE_KEY } from '../utils/helpers';

const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(isSupabaseConfigured());

  // ---- Supabase Auth Mode ----
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      // Offline mode: try sessionStorage
      try {
        const saved = sessionStorage.getItem('stockctrl-current-user');
        if (saved) setCurrentUser(JSON.parse(saved));
      } catch (e) { /* ignore */ }
      setLoading(false);
      return;
    }

    // Check current session
    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profile) {
            setCurrentUser({
              id: profile.id,
              username: profile.username,
              name: profile.full_name,
              role: profile.role,
              salary: Number(profile.salary) || 0,
              commissionRate: Number(profile.commission_rate) || 0,
              email: session.user.email,
            });
          }
        }
      } catch (e) {
        console.error('Error initializing session:', e);
      } finally {
        setLoading(false);
      }
    };

    initSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setCurrentUser(null);
        } else if (event === 'SIGNED_IN' && session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profile) {
            setCurrentUser({
              id: profile.id,
              username: profile.username,
              name: profile.full_name,
              role: profile.role,
              salary: Number(profile.salary) || 0,
              commissionRate: Number(profile.commission_rate) || 0,
              email: session.user.email,
            });
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // ---- Login ----
  const handleLogin = useCallback(async (emailOrUsername, password) => {
    if (!isSupabaseConfigured()) {
      // Offline/demo mode: localStorage login
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        const data = saved ? JSON.parse(saved) : DEFAULT_DATA;
        const uInput = emailOrUsername.trim().toLowerCase();
        const pInput = password.trim().toLowerCase();
        const user = data.users.find(
          (x) => x.username.trim().toLowerCase() === uInput && x.password.trim().toLowerCase() === pInput
        );
        if (!user) throw new Error('Usuario o contraseña incorrectos.');
        setCurrentUser(user);
        sessionStorage.setItem('stockctrl-current-user', JSON.stringify(user));
        return user;
      } catch (e) {
        if (e.message.includes('incorrectos')) throw e;
        throw new Error('Error al iniciar sesión.');
      }
    }

    // Online mode: Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailOrUsername,
      password,
    });

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        throw new Error('Usuario o contraseña incorrectos.');
      }
      throw new Error(error.message);
    }

    // Profile will be set by onAuthStateChange listener
    return data.user;
  }, []);

  // ---- Logout ----
  const handleLogout = useCallback(async () => {
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut();
    } else {
      sessionStorage.removeItem('stockctrl-current-user');
    }
    setCurrentUser(null);
  }, []);

  // ---- Reset Demo Users (offline only) ----
  const handleResetUsers = useCallback(() => {
    if (isSupabaseConfigured()) return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const data = saved ? JSON.parse(saved) : DEFAULT_DATA;
      data.users = DEFAULT_DATA.users;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) { /* ignore */ }
  }, []);

  const value = {
    currentUser,
    loading,
    isOnline,
    isAdmin: currentUser?.role === 'admin',
    handleLogin,
    handleLogout,
    handleResetUsers,
    setCurrentUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
