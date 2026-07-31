import { supabase, isSupabaseConfigured } from '../lib/supabase';

export async function getUsers() {
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);

  return (data || []).map(u => ({
    id: u.id,
    username: u.username,
    name: u.full_name,
    role: u.role,
    salary: Number(u.salary) || 0,
    commissionRate: Number(u.commission_rate) || 0,
    isActive: u.is_active,
    createdAt: u.created_at,
  }));
}

async function callAdminApi(action, payload) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('No estás autenticado');

  const res = await fetch('/api/admin-users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    },
    body: JSON.stringify({ action, payload })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Error al comunicarse con el servidor seguro');
  }
  return data;
}

export async function adminCreateUser(payload) {
  if (!isSupabaseConfigured()) throw new Error('Supabase no configurado');
  return await callAdminApi('create', payload);
}

export async function adminUpdateUser(payload) {
  if (!isSupabaseConfigured()) throw new Error('Supabase no configurado');
  return await callAdminApi('update', payload);
}

export async function adminDeleteUser(userId) {
  if (!isSupabaseConfigured()) throw new Error('Supabase no configurado');
  return await callAdminApi('delete', { id: userId });
}
