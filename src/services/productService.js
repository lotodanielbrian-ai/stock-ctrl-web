import { supabase, isSupabaseConfigured } from '../lib/supabase';

/**
 * Product CRUD service.
 * All operations go through Supabase — RLS enforces admin-only writes.
 */

export async function getProducts() {
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      categories ( id, name )
    `)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  // Map to the format expected by existing components
  return (data || []).map(p => ({
    id: p.id,
    name: p.name,
    photo: p.photo_url || '',
    costPrice: Number(p.cost_price) || 0,
    publicPrice: Number(p.public_price) || 0,
    quantity: Number(p.quantity) || 0,
    stockLocal: Number(p.stock_local) || 0,
    stockDeposito: Number(p.stock_deposito) || 0,
    minStock: Number(p.min_stock) || 5,
    category: p.categories?.name || 'General',
    categoryId: p.category_id,
    barcode: p.barcode || '',
    lastRestock: p.last_restock,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  }));
}

export async function getProductById(id) {
  if (!isSupabaseConfigured()) return null;

  const { data, error } = await supabase
    .from('products')
    .select('*, categories ( id, name )')
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function createProduct({ name, costPrice, publicPrice, quantity, stockLocal, stockDeposito, minStock, category, barcode, photoUrl }) {
  if (!isSupabaseConfigured()) throw new Error('Supabase no configurado');

  // Find or create category
  const categoryId = await findOrCreateCategory(category);

  // If quantity is provided but not stockLocal/stockDeposito (for backward compatibility)
  const loc = stockLocal !== undefined ? stockLocal : (quantity || 0);
  const dep = stockDeposito !== undefined ? stockDeposito : 0;

  const { data, error } = await supabase
    .from('products')
    .insert({
      name,
      cost_price: costPrice || 0,
      public_price: publicPrice || 0,
      quantity: loc + dep,
      stock_local: loc,
      stock_deposito: dep,
      min_stock: minStock || 5,
      category_id: categoryId,
      barcode: barcode || null,
      photo_url: photoUrl || '',
    })
    .select('*, categories ( id, name )')
    .single();

  if (error) {
    if (error.code === '23505' && error.message.includes('barcode')) {
      throw new Error('Ya existe un producto con ese código de barras.');
    }
    throw new Error(error.message);
  }

  return data;
}

export async function updateProduct(id, changes) {
  if (!isSupabaseConfigured()) throw new Error('Supabase no configurado');

  const updateData = {};
  if (changes.name !== undefined) updateData.name = changes.name;
  if (changes.costPrice !== undefined) updateData.cost_price = changes.costPrice;
  if (changes.publicPrice !== undefined) updateData.public_price = changes.publicPrice;
  if (changes.quantity !== undefined) updateData.quantity = changes.quantity;
  if (changes.stockLocal !== undefined) updateData.stock_local = changes.stockLocal;
  if (changes.stockDeposito !== undefined) updateData.stock_deposito = changes.stockDeposito;
  if (changes.minStock !== undefined) updateData.min_stock = changes.minStock;
  if (changes.barcode !== undefined) updateData.barcode = changes.barcode || null;
  if (changes.photoUrl !== undefined) updateData.photo_url = changes.photoUrl;

  if (changes.category !== undefined) {
    updateData.category_id = await findOrCreateCategory(changes.category);
  }

  const { data, error } = await supabase
    .from('products')
    .update(updateData)
    .eq('id', id)
    .select('*, categories ( id, name )')
    .single();

  if (error) {
    if (error.code === '23505' && error.message.includes('barcode')) {
      throw new Error('Ya existe un producto con ese código de barras.');
    }
    throw new Error(error.message);
  }

  return data;
}

export async function deleteProduct(id) {
  if (!isSupabaseConfigured()) throw new Error('Supabase no configurado');

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id);

  if (error) {
    if (error.code === '23503') {
      throw new Error('No se puede eliminar un producto con ventas registradas. Podés desactivarlo.');
    }
    throw new Error(error.message);
  }
}

/**
 * Upload product photo to Supabase Storage.
 * Returns the public URL.
 */
export async function uploadProductPhoto(file, productId) {
  if (!isSupabaseConfigured()) throw new Error('Supabase no configurado');

  const ext = file.name.split('.').pop();
  const path = `products/${productId || Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('product-photos')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (uploadError) throw new Error(uploadError.message);

  const { data } = supabase.storage
    .from('product-photos')
    .getPublicUrl(path);

  return data.publicUrl;
}

// ---- Helpers ----

async function findOrCreateCategory(name) {
  if (!name || name === 'General') {
    const { data } = await supabase
      .from('categories')
      .select('id')
      .eq('name', 'General')
      .single();
    return data?.id || null;
  }

  // Try to find existing
  const { data: existing } = await supabase
    .from('categories')
    .select('id')
    .eq('name', name)
    .single();

  if (existing) return existing.id;

  // Create new
  const { data: created, error } = await supabase
    .from('categories')
    .insert({ name })
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  return created.id;
}

export async function getCategories() {
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name');

  if (error) throw new Error(error.message);
  return data || [];
}
