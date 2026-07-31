-- ============================================
-- STOCK//CTRL v2.0 — Row Level Security Policies
-- ============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Helper: obtener rol del usuario actual
-- ============================================
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- ============================================
-- PROFILES
-- ============================================
-- Todos los usuarios autenticados pueden ver perfiles (necesario para UI)
CREATE POLICY "profiles_select_all"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Solo admin puede insertar nuevos perfiles
CREATE POLICY "profiles_insert_admin"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (public.current_user_role() = 'admin');

-- Admin puede editar cualquier perfil, vendedor solo el suyo
CREATE POLICY "profiles_update"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    id = auth.uid() OR public.current_user_role() = 'admin'
  );

-- Solo admin puede eliminar perfiles (no el suyo propio)
CREATE POLICY "profiles_delete_admin"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (
    public.current_user_role() = 'admin'
    AND id != auth.uid()
  );

-- ============================================
-- PRODUCTS
-- ============================================
-- Todos los autenticados pueden ver productos
CREATE POLICY "products_select_all"
  ON public.products FOR SELECT
  TO authenticated
  USING (true);

-- Solo admin puede crear productos
CREATE POLICY "products_insert_admin"
  ON public.products FOR INSERT
  TO authenticated
  WITH CHECK (public.current_user_role() = 'admin');

-- Solo admin puede editar productos
CREATE POLICY "products_update_admin"
  ON public.products FOR UPDATE
  TO authenticated
  USING (public.current_user_role() = 'admin');

-- Solo admin puede eliminar productos
CREATE POLICY "products_delete_admin"
  ON public.products FOR DELETE
  TO authenticated
  USING (public.current_user_role() = 'admin');

-- ============================================
-- SALES
-- ============================================
-- Cualquier autenticado puede registrar ventas (a su nombre)
CREATE POLICY "sales_insert_own"
  ON public.sales FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Admin puede ver todas las ventas
CREATE POLICY "sales_select_admin"
  ON public.sales FOR SELECT
  TO authenticated
  USING (public.current_user_role() = 'admin');

-- Vendedor solo puede ver sus propias ventas
CREATE POLICY "sales_select_own"
  ON public.sales FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Nadie puede modificar ni eliminar ventas (inmutables)
-- (No se crean políticas UPDATE/DELETE = denegado por RLS)

-- ============================================
-- CATEGORIES
-- ============================================
-- Todos los autenticados pueden ver categorías
CREATE POLICY "categories_select_all"
  ON public.categories FOR SELECT
  TO authenticated
  USING (true);

-- Solo admin puede crear/editar/eliminar categorías
CREATE POLICY "categories_insert_admin"
  ON public.categories FOR INSERT
  TO authenticated
  WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY "categories_update_admin"
  ON public.categories FOR UPDATE
  TO authenticated
  USING (public.current_user_role() = 'admin');

CREATE POLICY "categories_delete_admin"
  ON public.categories FOR DELETE
  TO authenticated
  USING (public.current_user_role() = 'admin');

-- ============================================
-- AUDIT_LOG
-- ============================================
-- Solo admin puede leer el log de auditoría
CREATE POLICY "audit_select_admin"
  ON public.audit_log FOR SELECT
  TO authenticated
  USING (public.current_user_role() = 'admin');

-- Inserts al audit log se hacen via SECURITY DEFINER functions
-- (no necesitan policy de INSERT para usuarios normales)
