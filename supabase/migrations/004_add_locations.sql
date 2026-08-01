-- ============================================
-- Migration 004: Add multi-location stock
-- ============================================

-- Add new columns
ALTER TABLE public.products
ADD COLUMN stock_local INTEGER NOT NULL DEFAULT 0 CHECK (stock_local >= 0),
ADD COLUMN stock_deposito INTEGER NOT NULL DEFAULT 0 CHECK (stock_deposito >= 0);

-- Migrate existing 'quantity' to 'stock_local'
UPDATE public.products
SET stock_local = quantity;

-- Trigger to sync quantity
CREATE OR REPLACE FUNCTION public.sync_total_quantity()
RETURNS TRIGGER AS $$
BEGIN
  NEW.quantity = NEW.stock_local + NEW.stock_deposito;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_sync_total_quantity
BEFORE INSERT OR UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.sync_total_quantity();

-- Update register_sale to deduct from stock_local
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
BEGIN
  -- Validar cantidad
  IF p_qty <= 0 THEN
    RAISE EXCEPTION 'La cantidad debe ser mayor a 0';
  END IF;

  -- Obtener producto con lock exclusivo (prevenir race conditions)
  SELECT * INTO v_product
    FROM public.products
    WHERE id = p_product_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Producto no encontrado (ID: %)', p_product_id;
  END IF;

  IF v_product.stock_local < p_qty THEN
    RAISE EXCEPTION 'Stock insuficiente en el local para "%". Disponible: %, Solicitado: %',
      v_product.name, v_product.stock_local, p_qty;
  END IF;

  -- Obtener datos del usuario autenticado
  SELECT * INTO v_user
    FROM public.profiles
    WHERE id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuario no autenticado o perfil no encontrado';
  END IF;

  -- Descontar stock_local (el trigger sync_total_quantity se encarga de actualizar quantity)
  UPDATE public.products
    SET stock_local = stock_local - p_qty
    WHERE id = p_product_id;

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

  RETURN json_build_object(
    'success', true,
    'sale_id', v_sale_id
  );
END;
$$;

-- Update restock_product to add to stock_local (since that's what was requested, or maybe we just add it to Deposito? Let's add it to Deposito by default so they can transfer it)
-- Actually, the user asked to filter and manage it. If we use restock_product it's simple, but we should probably change it to add to stock_local for backward compatibility, unless we add a location parameter.
CREATE OR REPLACE FUNCTION public.restock_product(
  p_product_id UUID,
  p_qty INTEGER,
  p_location TEXT DEFAULT 'local'
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_qty <= 0 THEN
    RAISE EXCEPTION 'La cantidad debe ser mayor a 0';
  END IF;

  IF p_location = 'local' THEN
    UPDATE public.products
      SET stock_local = stock_local + p_qty,
          last_restock = now()
      WHERE id = p_product_id;
  ELSE
    UPDATE public.products
      SET stock_deposito = stock_deposito + p_qty,
          last_restock = now()
      WHERE id = p_product_id;
  END IF;

  RETURN json_build_object('success', true);
END;
$$;
