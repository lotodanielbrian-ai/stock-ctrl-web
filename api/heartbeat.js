import { createClient } from '@supabase/supabase-js';

// Inicializar cliente Supabase solo para el cron
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

export default async function handler(request, response) {
  // Verificar autorización si se invoca manualmente con API_KEY, o si viene del cron de Vercel
  const authHeader = request.headers.authorization;
  if (
    authHeader !== `Bearer ${process.env.CRON_SECRET}` && 
    request.headers['user-agent'] !== 'vercel-cron/1.0'
  ) {
    return response.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Hacemos un count rápido a la tabla de productos para mantener la base de datos viva
    // Supabase pausa los proyectos gratuitos si no hay actividad en 7 días
    const { count, error } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('Error en heartbeat:', error);
      return response.status(500).json({ error: error.message });
    }

    return response.status(200).json({ 
      status: 'ok', 
      message: 'Base de datos activa',
      timestamp: new Date().toISOString(),
      rows: count
    });
  } catch (err) {
    console.error('Excepción en heartbeat:', err);
    return response.status(500).json({ error: err.message });
  }
}
