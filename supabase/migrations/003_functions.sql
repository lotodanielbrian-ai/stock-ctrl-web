-- ============================================
-- STOCK//CTRL v2.0 — Database Functions
-- ============================================

-- ============================================
-- Función atómica de venta con lock de stock
-- ============================================
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

  IF v_product.quantity < p_qty THEN
    RAISE EXCEPTION 'Stock insuficiente para "%". Disponible: %, Solicitado: %',
      v_product.name, v_product.quantity, p_qty;
  END IF;

  -- Obtener datos del usuario autenticado
  SELECT * INTO v_user
    FROM public.profiles
    WHERE id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuario no autenticado o perfil no encontrado';
  END IF;

  -- Descontar stock
  UPDATE public.products
    SET quantity = quantity - p_qty
    WHERE id = p_product_id;

  -- Registrar venta
  INSERT INTO public.sales (
    product_id, product_name, qty, unit_price, cost_price,
    payment_method, payment_detail, user_id, user_name
  ) VALUES (
    p_product_id, v_product.name, p_qty,
    v_product.public_price, v_product.cost_price,
    p_payment_method, COALESCE(p_payment_detail, ''),
    auth.uid(), v_user.full_name
  ) RETURNING id INTO v_sale_id;

  -- Calcular revenue para el response
  v_revenue := v_product.public_price * p_qty;

  -- Registrar en audit log
  INSERT INTO public.audit_log (user_id, action, table_name, record_id, new_data)
  VALUES (
    auth.uid(), 'SALE', 'sales', v_sale_id::TEXT,
    jsonb_build_object(
      'product', v_product.name,
      'qty', p_qty,
      'revenue', v_revenue,
      'payment', p_payment_method::TEXT
    )
  );

  -- Retornar resultado
  RETURN json_build_object(
    'sale_id', v_sale_id,
    'product_name', v_product.name,
    'qty', p_qty,
    'unit_price', v_product.public_price,
    'total', v_revenue,
    'remaining_stock', v_product.quantity - p_qty,
    'payment_method', p_payment_method::TEXT
  );
END;
$$;

-- ============================================
-- Función de reposición de stock
-- ============================================
CREATE OR REPLACE FUNCTION public.restock_product(
  p_product_id UUID,
  p_qty INTEGER
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product RECORD;
  v_new_qty INTEGER;
BEGIN
  -- Solo admin puede reponer stock
  IF public.current_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Solo administradores pueden reponer stock';
  END IF;

  IF p_qty <= 0 THEN
    RAISE EXCEPTION 'La cantidad a reponer debe ser mayor a 0';
  END IF;

  SELECT * INTO v_product
    FROM public.products
    WHERE id = p_product_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Producto no encontrado';
  END IF;

  v_new_qty := v_product.quantity + p_qty;

  UPDATE public.products
    SET quantity = v_new_qty, last_restock = now()
    WHERE id = p_product_id;

  -- Audit log
  INSERT INTO public.audit_log (user_id, action, table_name, record_id, old_data, new_data)
  VALUES (
    auth.uid(), 'RESTOCK', 'products', p_product_id::TEXT,
    jsonb_build_object('quantity', v_product.quantity),
    jsonb_build_object('quantity', v_new_qty, 'added', p_qty)
  );

  RETURN json_build_object(
    'product_name', v_product.name,
    'previous_qty', v_product.quantity,
    'added', p_qty,
    'new_qty', v_new_qty
  );
END;
$$;

-- ============================================
-- Vista de estadísticas de ventas por período
-- ============================================
CREATE OR REPLACE FUNCTION public.get_sales_stats(
  p_start TIMESTAMPTZ,
  p_end TIMESTAMPTZ
)
RETURNS JSON
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Solo admin puede ver estadísticas completas
  IF public.current_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Acceso denegado';
  END IF;

  SELECT json_build_object(
    'total_revenue', COALESCE(SUM(unit_price * qty), 0),
    'total_cost', COALESCE(SUM(cost_price * qty), 0),
    'total_profit', COALESCE(SUM((unit_price - cost_price) * qty), 0),
    'total_sales', COUNT(*),
    'total_units', COALESCE(SUM(qty), 0),
    'avg_ticket', CASE WHEN COUNT(*) > 0
      THEN COALESCE(SUM(unit_price * qty), 0) / COUNT(*)
      ELSE 0 END,
    'by_payment_method', (
      SELECT json_agg(json_build_object(
        'method', pm.payment_method::TEXT,
        'count', pm.cnt,
        'revenue', pm.rev
      ))
      FROM (
        SELECT payment_method, COUNT(*) as cnt, SUM(unit_price * qty) as rev
        FROM public.sales
        WHERE created_at >= p_start AND created_at <= p_end
        GROUP BY payment_method
        ORDER BY rev DESC
      ) pm
    )
  ) INTO v_result
  FROM public.sales
  WHERE created_at >= p_start AND created_at <= p_end;

  RETURN v_result;
END;
$$;
