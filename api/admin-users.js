import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const { action, payload } = req.body;

  if (!action || !payload) {
    return res.status(400).json({ error: 'Bad request: missing action or payload' });
  }

  const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Falta configurar SUPABASE_SERVICE_ROLE_KEY en Vercel' });
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado: Se requieren permisos de administrador' });
    }

      if (action === 'create') {
      const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: payload.username + '@toty.com',
        password: payload.password,
        email_confirm: true,
        user_metadata: {
          username: payload.username,
          full_name: payload.name,
          role: payload.role,
          assignedLocation: payload.assignedLocation || 'local1',
        }
      });

      if (createError) throw createError;
      
      const newUserId = authData.user.id;
      
      const { error: upsertProfileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: newUserId,
          username: payload.username,
          full_name: payload.name,
          role: payload.role,
          salary: payload.salary || 0,
          commission_rate: payload.commissionRate || 0,
          assigned_location: payload.assignedLocation || 'local1',
          is_active: true
        });

      if (upsertProfileError) throw upsertProfileError;

      return res.status(200).json({ success: true, user: authData.user });
    } 
    
    else if (action === 'update') {
      if (payload.password && payload.password.trim() !== '') {
        const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
          payload.id,
          { password: payload.password }
        );
        if (passwordError) throw passwordError;
      }

      // If we are updating location or role, maybe update auth metadata too if we wanted, but updating profiles table is enough for the app
      const { data: updatedProfile, error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          full_name: payload.name,
          username: payload.username,
          role: payload.role,
          salary: payload.salary,
          commission_rate: payload.commissionRate,
          assigned_location: payload.assignedLocation,
        })
        .eq('id', payload.id)
        .select()
        .single();

      if (updateError) throw updateError;

      return res.status(200).json({ success: true, profile: updatedProfile });
    } 
    
    else if (action === 'delete') {
      const { error: deleteError } = await supabaseAdmin
        .from('profiles')
        .update({ is_active: false })
        .eq('id', payload.id);

      if (deleteError) throw deleteError;
      
      return res.status(200).json({ success: true });
    }

    else {
      return res.status(400).json({ error: 'Invalid action' });
    }

  } catch (err) {
    console.error('Admin API error:', err);
    return res.status(500).json({ error: err.message || 'Error interno del servidor' });
  }
}
