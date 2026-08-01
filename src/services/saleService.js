import { supabase, isSupabaseConfigured } from '../lib/supabase';

/**
 * Sale service.
 * Uses the atomic `register_sale` PostgreSQL function for safe stock deduction.
 */

export async function registerSale(productId, qty, location = 'local1', paymentMethod = 'efectivo', paymentDetail = '') {
  if (!isSupabaseConfigured()) throw new Error('Supabase no configurado');

  const { data, error } = await supabase.rpc('register_sale', {
    p_product_id: productId,
    p_qty: qty,
    p_payment_method: paymentMethod,
    p_payment_detail: paymentDetail || '',
  });

  if (error) {
    // Parse PostgreSQL error messages into user-friendly messages
    if (error.message.includes('Stock insuficiente')) {
      const match = error.message.match(/Disponible: (\d+)/);
      throw new Error(`Stock insuficiente. Disponible: ${match ? match[1] : '0'} unidades.`);
    }
    if (error.message.includes('Producto no encontrado')) {
      throw new Error('Producto no encontrado en el inventario.');
    }
    throw new Error(error.message);
  }

  return data;
}

export async function restockProduct(productId, qty, location = 'deposito') {
  if (!isSupabaseConfigured()) throw new Error('Supabase no configurado');

  const { data, error } = await supabase.rpc('restock_product', {
    p_product_id: productId,
    p_qty: qty,
    p_location: location,
  });

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteSaleRecord(saleId) {
  if (!isSupabaseConfigured()) return;
  const { error } = await supabase.from('sales').delete().eq('id', saleId);
  if (error) throw new Error(error.message);
}

export async function updateSalesPaymentMethod(saleIds, paymentMethod) {
  if (!isSupabaseConfigured()) throw new Error('Supabase no configurado');

  if (!saleIds || saleIds.length === 0) return { success: true, updated: 0 };

  const { data, error } = await supabase.rpc('update_sale_payment', {
    p_sale_ids: saleIds,
    p_payment_method: paymentMethod,
  });

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Fetch sales history with optional filters.
 * @param {Object} filters
 * @param {string} filters.period - 'hoy' | 'semana' | 'mes' | 'todo'
 * @param {string} filters.userId - filter by seller UUID or 'all'
 * @param {string} filters.paymentMethod - filter by payment_method or 'all'
 * @param {string} filters.search - text search
 * @param {number} filters.page - page number (1-indexed)
 * @param {number} filters.pageSize - items per page
 */
export async function getSales(filters = {}) {
  if (!isSupabaseConfigured()) return { sales: [], count: 0 };

  const {
    period = 'mes',
    userId = 'all',
    paymentMethod = 'all',
    search = '',
    page = 1,
    pageSize = 50,
  } = filters;

  let query = supabase
    .from('sales')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  // Period filter
  if (period !== 'todo') {
    const now = new Date();
    let start;
    if (period === 'hoy') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === 'semana') {
      start = new Date(now);
      const day = (start.getDay() + 6) % 7;
      start.setDate(start.getDate() - day);
      start.setHours(0, 0, 0, 0);
    } else if (period === 'mes') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    if (start) {
      query = query.gte('created_at', start.toISOString());
    }
  }

  // User filter
  if (userId !== 'all') {
    query = query.eq('user_id', userId);
  }

  // Payment method filter
  if (paymentMethod !== 'all') {
    query = query.eq('payment_method', paymentMethod);
  }

  // Text search (product name or user name)
  if (search.trim()) {
    query = query.or(`product_name.ilike.%${search}%,user_name.ilike.%${search}%`);
  }

  // Pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) throw new Error(error.message);

  // Map to component-compatible format
  const sales = (data || []).map(s => ({
    id: s.id,
    productId: s.product_id,
    productName: s.product_name,
    qty: s.qty,
    unitPrice: Number(s.unit_price) || 0,
    costPrice: Number(s.cost_price) || 0,
    paymentMethod: s.payment_method || 'efectivo',
    paymentDetail: s.payment_detail || '',
    userId: s.user_id,
    userName: s.user_name,
    date: s.created_at,
  }));

  return { sales, count: count || 0 };
}

/**
 * Get today's sales for a specific user.
 */
export async function getTodaySales(userId) {
  if (!isSupabaseConfigured()) return [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('sales')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', today.toISOString())
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return (data || []).map(s => ({
    id: s.id,
    productId: s.product_id,
    productName: s.product_name,
    qty: s.qty,
    unitPrice: Number(s.unit_price) || 0,
    costPrice: Number(s.cost_price) || 0,
    paymentMethod: s.payment_method || 'efectivo',
    paymentDetail: s.payment_detail || '',
    userId: s.user_id,
    userName: s.user_name,
    date: s.created_at,
  }));
}

/**
 * Get all sales within a date range (for stats computation).
 */
export async function getSalesByDateRange(startDate, endDate) {
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await supabase
    .from('sales')
    .select('*')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);

  return (data || []).map(s => ({
    id: s.id,
    productId: s.product_id,
    productName: s.product_name,
    qty: s.qty,
    unitPrice: Number(s.unit_price) || 0,
    costPrice: Number(s.cost_price) || 0,
    paymentMethod: s.payment_method || 'efectivo',
    paymentDetail: s.payment_detail || '',
    userId: s.user_id,
    userName: s.user_name,
    date: s.created_at,
  }));
}

/**
 * Get aggregated stats for a time period.
 */
export async function getStats(startDate, endDate) {
  if (!isSupabaseConfigured()) return null;

  const { data, error } = await supabase.rpc('get_sales_stats', {
    p_start: startDate.toISOString(),
    p_end: endDate.toISOString(),
  });

  if (error) throw new Error(error.message);
  return data;
}
