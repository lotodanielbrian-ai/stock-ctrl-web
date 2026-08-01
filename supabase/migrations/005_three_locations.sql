-- ============================================
-- Migration 005: 3 Locations (Local 1, Local 2, Deposito) & User Assignment
-- ============================================

-- Safely remove old columns if they exist from the previous attempt
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='stock_local') THEN
        ALTER TABLE public.products DROP COLUMN stock_local;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='stock_deposito') THEN
        ALTER TABLE public.products DROP COLUMN stock_deposito;
    END IF;
END $$;

-- Add new columns to products
ALTER TABLE public.products
ADD COLUMN stock_local_1 INTEGER NOT NULL DEFAULT 0 CHECK (stock_local_1 >= 0),
ADD COLUMN stock_local_2 INTEGER NOT NULL DEFAULT 0 CHECK (stock_local_2 >= 0),
ADD COLUMN stock_deposito INTEGER NOT NULL DEFAULT 0 CHECK (stock_deposito >= 0);

-- Migrate existing 'quantity' to 'stock_local_1'
UPDATE public.products
SET stock_local_1 = quantity;

-- Trigger to sync quantity
CREATE OR REPLACE FUNCTION public.sync_total_quantity()
RETURNS TRIGGER AS $$
BEGIN
  NEW.quantity = NEW.stock_local_1 + NEW.stock_local_2 + NEW.stock_deposito;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_sync_total_quantity ON public.products;
CREATE TRIGGER tr_sync_total_quantity
BEFORE INSERT OR UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.sync_total_quantity();

-- Add assigned_location to profiles
ALTER TABLE public.profiles
ADD COLUMN assigned_location TEXT NOT NULL DEFAULT 'local1' CHECK (assigned_location IN ('local1', 'local2', 'deposito'));

-- Update trigger for new users to set assigned_location
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, role, assigned_location)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Nuevo Usuario'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'vendedor'),
    COALESCE(NEW.raw_user_meta_data->>'assignedLocation', 'local1')
  );
  RETURN NEW;
END;
$$;

-- Update register_sale to automatically detect location from profile
CREATE OR REPLACE FUNCTION public.register_sale(
  p_product_id UUID,
  p_qty INTEGER,
  p_payment_method payment_method DEFAULT 'efectivo',
  p_payment_detail TEXT DEFAULT ''
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product RECORD;
  v_user RECORD;
  v_sale_id UUID;
  v_revenue NUMERIC(12,2);
  v_location TEXT;
BEGIN
  -- Validar cantidad
  IF p_qty <= 0 THEN
    RAISE EXCEPTION 'La cantidad debe ser mayor a 0';
  END IF;

  -- Obtener datos del usuario autenticado y su sucursal
  SELECT * INTO v_user
    FROM public.profiles
    WHERE id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuario no autenticado o perfil no encontrado';
  END IF;
  
  v_location := v_user.assigned_location;

  -- Obtener producto con lock exclusivo (prevenir race conditions)
  SELECT * INTO v_product
    FROM public.products
    WHERE id = p_product_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Producto no encontrado (ID: %)', p_product_id;
  END IF;

  -- Check stock and update based on user's location
  IF v_location = 'local1' THEN
      IF v_product.stock_local_1 < p_qty THEN
        RAISE EXCEPTION 'Stock insuficiente en Local 1 para "%". Disponible: %, Solicitado: %',
          v_product.name, v_product.stock_local_1, p_qty;
      END IF;
      UPDATE public.products SET stock_local_1 = stock_local_1 - p_qty WHERE id = p_product_id;

  ELSIF v_location = 'local2' THEN
      IF v_product.stock_local_2 < p_qty THEN
        RAISE EXCEPTION 'Stock insuficiente en Local 2 para "%". Disponible: %, Solicitado: %',
          v_product.name, v_product.stock_local_2, p_qty;
      END IF;
      UPDATE public.products SET stock_local_2 = stock_local_2 - p_qty WHERE id = p_product_id;

  ELSIF v_location = 'deposito' THEN
      IF v_product.stock_deposito < p_qty THEN
        RAISE EXCEPTION 'Stock insuficiente en Depósito para "%". Disponible: %, Solicitado: %',
          v_product.name, v_product.stock_deposito, p_qty;
      END IF;
      UPDATE public.products SET stock_deposito = stock_deposito - p_qty WHERE id = p_product_id;

  ELSE
      RAISE EXCEPTION 'Ubicación de venta no válida: %', v_location;
  END IF;

  -- Registrar venta
  INSERT INTO public.sales (
    product_id, product_name, qty, unit_price, cost_price,
    payment_method, payment_detail, user_id, user_name, user_role
  ) VALUES (
    p_product_id, v_product.name, p_qty, v_product.public_price, v_product.cost_price,
    p_payment_method, p_payment_detail, v_user.id, v_user.full_name, v_user.role
  ) RETURNING id INTO v_sale_id;

  -- Calcular comisión
  v_revenue := v_product.public_price * p_qty;
  INSERT INTO public.commissions (
    user_id, sale_id, amount, rate, is_paid
  ) VALUES (
    v_user.id,
    v_sale_id,
    ROUND(v_revenue * (v_user.commission_rate / 100), 2),
    v_user.commission_rate,
    false
  );

  NOTIFY pgrst, 'reload schema';

  RETURN json_build_object(
    'success', true,
    'sale_id', v_sale_id
  );
END;
$$;

-- Update restock_product to handle the 3 locations
CREATE OR REPLACE FUNCTION public.restock_product(
  p_product_id UUID,
  p_qty INTEGER,
  p_location TEXT DEFAULT 'deposito'
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_qty <= 0 THEN
    RAISE EXCEPTION 'La cantidad debe ser mayor a 0';
  END IF;

  IF p_location = 'local1' THEN
    UPDATE public.products SET stock_local_1 = stock_local_1 + p_qty, last_restock = now() WHERE id = p_product_id;
  ELSIF p_location = 'local2' THEN
    UPDATE public.products SET stock_local_2 = stock_local_2 + p_qty, last_restock = now() WHERE id = p_product_id;
  ELSE
    UPDATE public.products SET stock_deposito = stock_deposito + p_qty, last_restock = now() WHERE id = p_product_id;
  END IF;

  RETURN json_build_object('success', true);
END;
$$;
