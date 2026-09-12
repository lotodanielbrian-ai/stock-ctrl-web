import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured, isNetworkAuthError } from '../lib/supabase';
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
  const [forceOffline, setForceOffline] = useState(false);
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
              assignedLocation: profile.assigned_location || 'local1',
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
              assignedLocation: profile.assigned_location || 'local1',
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

    if (forceOffline) {
      const saved = localStorage.getItem(STORAGE_KEY);
      const data = saved ? JSON.parse(saved) : DEFAULT_DATA;
      const uInput = emailOrUsername.trim().toLowerCase();
      const pInput = password.trim().toLowerCase();
      const user = data.users.find(
        (x) => x.username.trim().toLowerCase() === uInput && x.password.trim().toLowerCase() === pInput
      );
      if (!user) throw new Error('Usuario o contraseña incorrectos.');
      setCurrentUser({ ...user, assignedLocation: user.assignedLocation || 'local1' });
      sessionStorage.setItem('stockctrl-current-user', JSON.stringify(user));
      return user;
    }

    // Online mode: Supabase Auth
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailOrUsername,
        password,
      });

      if (error) {
        if (isNetworkAuthError(error)) {
          throw new Error('No se pudo conectar con el servidor de cuentas. El proyecto Supabase no responde; no es un error de usuario o contraseña.');
        }
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Usuario o contraseña incorrectos.');
        }
        throw new Error(error.message);
      }

      // Profile will be set by onAuthStateChange listener
      return data.user;
    } catch (e) {
      if (e.message && e.message.includes('servidor de cuentas')) throw e;
      if (e.message && e.message.includes('incorrectos')) throw e;
      if (isNetworkAuthError(e)) {
        throw new Error('No se pudo conectar con el servidor de cuentas. El proyecto Supabase no responde; no es un error de usuario o contraseña.');
      }
      throw e;
    }
  }, [forceOffline]);

  // ---- Logout ----
  const handleLogout = useCallback(async () => {
    if (isSupabaseConfigured() && !forceOffline) {
      await supabase.auth.signOut();
    }
    sessionStorage.removeItem('stockctrl-current-user');
    setCurrentUser(null);
  }, [forceOffline]);

  // ---- Reset Demo Users (offline only) ----
  const enterLocalMode = useCallback(() => {
    setForceOffline(true);
    setIsOnline(false);
    const admin = DEFAULT_DATA.users.find((u) => u.role === 'admin') || DEFAULT_DATA.users[0];
    const user = { ...admin, assignedLocation: admin.assignedLocation || 'local1' };
    setCurrentUser(user);
    sessionStorage.setItem('stockctrl-current-user', JSON.stringify(user));
    return user;
  }, []);

  const handleResetUsers = useCallback(() => {
    if (isSupabaseConfigured() && !forceOffline) return;
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
    enterLocalMode,
    forceOffline,
    setCurrentUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
