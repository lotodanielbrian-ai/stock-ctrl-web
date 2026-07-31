import { supabase, isSupabaseConfigured } from '../lib/supabase';

/**
 * User/profile management service.
 * All write operations are admin-only (enforced by RLS).
 */

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

export async function updateProfile(userId, changes) {
  if (!isSupabaseConfigured()) throw new Error('Supabase no configurado');

  const updateData = {};
  if (changes.name !== undefined) updateData.full_name = changes.name;
  if (changes.username !== undefined) updateData.username = changes.username;
  if (changes.role !== undefined) updateData.role = changes.role;
  if (changes.salary !== undefined) updateData.salary = changes.salary;
  if (changes.commissionRate !== undefined) updateData.commission_rate = changes.commissionRate;
  if (changes.isActive !== undefined) updateData.is_active = changes.isActive;

  const { data, error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    if (error.code === '23505' && error.message.includes('username')) {
      throw new Error('Ese nombre de usuario ya está en uso.');
    }
    throw new Error(error.message);
  }

  return {
    id: data.id,
    username: data.username,
    name: data.full_name,
    role: data.role,
    salary: Number(data.salary) || 0,
    commissionRate: Number(data.commission_rate) || 0,
    isActive: data.is_active,
  };
}

export async function deleteUser(userId) {
  if (!isSupabaseConfigured()) throw new Error('Supabase no configurado');

  // Soft-delete: just deactivate
  const { error } = await supabase
    .from('profiles')
    .update({ is_active: false })
    .eq('id', userId);

  if (error) throw new Error(error.message);
}
