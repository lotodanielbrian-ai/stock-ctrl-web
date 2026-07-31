import { supabase, isSupabaseConfigured } from '../lib/supabase';

/**
 * Authentication service.
 * Uses Supabase Auth when configured, falls back to local demo mode.
 */

export async function login(email, password) {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase no configurado. Usá el modo demo local.');
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    if (error.message.includes('Invalid login credentials')) {
      throw new Error('Usuario o contraseña incorrectos.');
    }
    throw new Error(error.message);
  }

  // Fetch user profile
  const profile = await getProfile(data.user.id);
  return { ...data.user, profile };
}

export async function logout() {
  if (!isSupabaseConfigured()) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

export async function getCurrentSession() {
  if (!isSupabaseConfigured()) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function getCurrentUser() {
  if (!isSupabaseConfigured()) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const profile = await getProfile(user.id);
  return { ...user, profile };
}

export function onAuthStateChange(callback) {
  if (!isSupabaseConfigured()) return { data: { subscription: { unsubscribe: () => {} } } };
  return supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      const profile = await getProfile(session.user.id);
      callback(event, { ...session, user: { ...session.user, profile } });
    } else {
      callback(event, session);
    }
  });
}

async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
  return data;
}

/**
 * Admin-only: Create a new user via Supabase Auth.
 * The trigger `on_auth_user_created` will auto-create the profile.
 */
export async function createUser({ email, password, username, fullName, role, salary, commissionRate }) {
  if (!isSupabaseConfigured()) throw new Error('Supabase no configurado');

  // Use supabase.auth.admin is not available from client - use Edge Function
  // For now, use signUp and then update profile
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
        full_name: fullName,
        role: role || 'vendedor',
      },
    },
  });

  if (error) throw new Error(error.message);

  // Update profile with salary and commission
  if (data.user) {
    await supabase.from('profiles').update({
      salary: salary || 0,
      commission_rate: commissionRate || 0,
    }).eq('id', data.user.id);
  }

  return data.user;
}
