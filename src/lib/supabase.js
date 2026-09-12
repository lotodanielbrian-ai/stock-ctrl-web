import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[STOCK//CTRL] Variables de entorno de Supabase no configuradas.\n' +
    'Creá un archivo .env.local con:\n' +
    '  VITE_SUPABASE_URL=https://tu-proyecto.supabase.co\n' +
    '  VITE_SUPABASE_ANON_KEY=tu-anon-key\n' +
    'Mientras tanto, la app funcionará en modo offline con localStorage.'
  );
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

export const isSupabaseConfigured = () => !!supabase;

export function isNetworkAuthError(err) {
  const msg = String(err?.message || err || "");
  return /failed to fetch|networkerror|network request failed|load failed|err_name_not_resolved|err_connection|name_not_resolved/i.test(msg);
}

export async function probeSupabase() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return { ok: false, reason: "unconfigured" };
  }
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/health`, {
      method: "GET",
      headers: { apikey: supabaseAnonKey },
    });
    return { ok: res.ok, status: res.status, reason: res.ok ? "ok" : "http" };
  } catch (e) {
    return { ok: false, reason: "network", message: e.message };
  }
}
