-- ============================================
-- Migration 007: Caja registradora
-- Cajas numeradas, sesiones/arqueo, tickets, fiscal
-- ============================================

CREATE TABLE IF NOT EXISTS public.cash_registers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number TEXT NOT NULL,
  name TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT 'local1' CHECK (location IN ('local1', 'local2', 'deposito')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  afip_punto_venta INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (number)
);

CREATE TABLE IF NOT EXISTS public.cash_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  register_id UUID NOT NULL REFERENCES public.cash_registers(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  user_name TEXT NOT NULL,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  opening_float NUMERIC(12,2) NOT NULL DEFAULT 0,
  expected_cash NUMERIC(12,2) NOT NULL DEFAULT 0,
  counted_cash NUMERIC(12,2),
  difference NUMERIC(12,2),
  notes TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed'))
);

CREATE TABLE IF NOT EXISTS public.cash_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.cash_sessions(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('opening_float', 'cash_sale', 'withdrawal', 'deposit', 'expense')),
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS public.ticket_seq START 1;

CREATE TABLE IF NOT EXISTS public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT,
  register_id UUID REFERENCES public.cash_registers(id) ON DELETE SET NULL,
  session_id UUID REFERENCES public.cash_sessions(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  user_name TEXT NOT NULL,
  payment_method payment_method NOT NULL DEFAULT 'efectivo',
  payment_detail TEXT DEFAULT '',
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  cash_received NUMERIC(12,2) NOT NULL DEFAULT 0,
  change_given NUMERIC(12,2) NOT NULL DEFAULT 0,
  invoice_type TEXT NOT NULL DEFAULT 'ticket' CHECK (invoice_type IN ('ticket', 'factura_a', 'factura_b', 'factura_c')),
  customer_name TEXT DEFAULT '',
  customer_doc_type TEXT DEFAULT '',
  customer_doc TEXT DEFAULT '',
  cae TEXT DEFAULT '',
  cae_vto TEXT DEFAULT '',
  invoice_number TEXT DEFAULT '',
  fiscal_status TEXT NOT NULL DEFAULT 'none' CHECK (fiscal_status IN ('none', 'pending', 'issued', 'error')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fiscal_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  cuit TEXT DEFAULT '',
  razon_social TEXT DEFAULT '',
  condicion_iva TEXT DEFAULT 'monotributo',
  iibb TEXT DEFAULT '',
  domicilio TEXT DEFAULT '',
  afip_enabled BOOLEAN NOT NULL DEFAULT false,
  afip_ambiente TEXT NOT NULL DEFAULT 'homologacion' CHECK (afip_ambiente IN ('homologacion', 'produccion')),
  punto_venta_default INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.fiscal_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS ticket_id UUID REFERENCES public.tickets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS register_id UUID REFERENCES public.cash_registers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.cash_sessions(id) ON DELETE SET NULL;

INSERT INTO public.cash_registers (id, number, name, location, afip_punto_venta)
VALUES
  ('11111111-1111-1111-1111-111111111101', '01', 'CAJA1', 'local1', 1),
  ('11111111-1111-1111-1111-111111111102', '02', 'CAJA2', 'local2', 2),
  ('11111111-1111-1111-1111-111111111103', '03', 'CAJA-DEP', 'deposito', 3)
ON CONFLICT (number) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_cash_sessions_register ON public.cash_sessions(register_id, status);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_user ON public.cash_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_created ON public.tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_ticket ON public.sales(ticket_id);

ALTER TABLE public.cash_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscal_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "registers_select_all" ON public.cash_registers;
CREATE POLICY "registers_select_all" ON public.cash_registers FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "registers_write_admin" ON public.cash_registers;
CREATE POLICY "registers_write_admin" ON public.cash_registers FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "sessions_select" ON public.cash_sessions;
CREATE POLICY "sessions_select" ON public.cash_sessions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "movements_select" ON public.cash_movements;
CREATE POLICY "movements_select" ON public.cash_movements FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cash_sessions s
      WHERE s.id = session_id AND (s.user_id = auth.uid() OR public.current_user_role() = 'admin')
    )
  );

DROP POLICY IF EXISTS "tickets_select" ON public.tickets;
CREATE POLICY "tickets_select" ON public.tickets FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "fiscal_select" ON public.fiscal_settings;
CREATE POLICY "fiscal_select" ON public.fiscal_settings FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "fiscal_write_admin" ON public.fiscal_settings;
CREATE POLICY "fiscal_write_admin" ON public.fiscal_settings FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

-- Writes go through SECURITY DEFINER functions below.

CREATE OR REPLACE FUNCTION public.open_cash_session(
  p_register_id UUID,
  p_opening_float NUMERIC DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user RECORD;
  v_session_id UUID;
BEGIN
  SELECT * INTO v_user FROM public.profiles WHERE id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.cash_sessions
    WHERE register_id = p_register_id AND status = 'open'
  ) THEN
    RAISE EXCEPTION 'Esa caja ya tiene una sesión abierta';
  END IF;

  INSERT INTO public.cash_sessions (
    register_id, user_id, user_name, opening_float, expected_cash, status
  ) VALUES (
    p_register_id, v_user.id, v_user.full_name, COALESCE(p_opening_float, 0), COALESCE(p_opening_float, 0), 'open'
  ) RETURNING id INTO v_session_id;

  INSERT INTO public.cash_movements (session_id, type, amount, note)
  VALUES (v_session_id, 'opening_float', COALESCE(p_opening_float, 0), 'Fondo inicial');

  RETURN json_build_object('success', true, 'session_id', v_session_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.add_cash_movement(
  p_session_id UUID,
  p_type TEXT,
  p_amount NUMERIC,
  p_note TEXT DEFAULT ''
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session RECORD;
BEGIN
  SELECT * INTO v_session FROM public.cash_sessions WHERE id = p_session_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sesión no encontrada';
  END IF;
  IF v_session.status <> 'open' THEN
    RAISE EXCEPTION 'La sesión ya está cerrada';
  END IF;
  IF v_session.user_id <> auth.uid() AND public.current_user_role() <> 'admin' THEN
    RAISE EXCEPTION 'No podés mover dinero de otra caja';
  END IF;
  IF p_type NOT IN ('withdrawal', 'deposit', 'expense') THEN
    RAISE EXCEPTION 'Tipo de movimiento no permitido';
  END IF;

  INSERT INTO public.cash_movements (session_id, type, amount, note)
  VALUES (p_session_id, p_type, COALESCE(p_amount, 0), COALESCE(p_note, ''));

  RETURN json_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.close_cash_session(
  p_session_id UUID,
  p_counted_cash NUMERIC,
  p_notes TEXT DEFAULT ''
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session RECORD;
  v_expected NUMERIC(12,2);
BEGIN
  SELECT * INTO v_session FROM public.cash_sessions WHERE id = p_session_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sesión no encontrada';
  END IF;
  IF v_session.status <> 'open' THEN
    RAISE EXCEPTION 'La sesión ya está cerrada';
  END IF;
  IF v_session.user_id <> auth.uid() AND public.current_user_role() <> 'admin' THEN
    RAISE EXCEPTION 'No podés cerrar la caja de otro cajero';
  END IF;

  SELECT
    v_session.opening_float
    + COALESCE(SUM(CASE WHEN type IN ('cash_sale', 'deposit') THEN amount ELSE 0 END), 0)
    - COALESCE(SUM(CASE WHEN type IN ('withdrawal', 'expense') THEN amount ELSE 0 END), 0)
  INTO v_expected
  FROM public.cash_movements
  WHERE session_id = p_session_id AND type <> 'opening_float';

  UPDATE public.cash_sessions SET
    status = 'closed',
    closed_at = now(),
    expected_cash = COALESCE(v_expected, v_session.opening_float),
    counted_cash = COALESCE(p_counted_cash, 0),
    difference = COALESCE(p_counted_cash, 0) - COALESCE(v_expected, v_session.opening_float),
    notes = COALESCE(p_notes, '')
  WHERE id = p_session_id;

  RETURN json_build_object(
    'success', true,
    'expected', COALESCE(v_expected, v_session.opening_float),
    'counted', COALESCE(p_counted_cash, 0),
    'difference', COALESCE(p_counted_cash, 0) - COALESCE(v_expected, v_session.opening_float)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.register_ticket(
  p_items JSONB,
  p_payment_method payment_method DEFAULT 'efectivo',
  p_payment_detail TEXT DEFAULT '',
  p_register_id UUID DEFAULT NULL,
  p_session_id UUID DEFAULT NULL,
  p_cash_received NUMERIC DEFAULT 0,
  p_change_given NUMERIC DEFAULT 0,
  p_invoice_type TEXT DEFAULT 'ticket',
  p_customer_name TEXT DEFAULT '',
  p_customer_doc_type TEXT DEFAULT '',
  p_customer_doc TEXT DEFAULT '',
  p_ticket_number TEXT DEFAULT '',
  p_subtotal NUMERIC DEFAULT 0,
  p_discount_total NUMERIC DEFAULT 0,
  p_total NUMERIC DEFAULT 0,
  p_fiscal_status TEXT DEFAULT 'none',
  p_cae TEXT DEFAULT '',
  p_cae_vto TEXT DEFAULT '',
  p_invoice_number TEXT DEFAULT ''
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user RECORD;
  v_product RECORD;
  v_location TEXT;
  v_ticket_id UUID;
  v_item JSONB;
  v_qty INTEGER;
  v_unit NUMERIC(12,2);
  v_discount NUMERIC(12,2);
  v_sale_ids UUID[] := ARRAY[]::UUID[];
  v_sale_id UUID;
BEGIN
  SELECT * INTO v_user FROM public.profiles WHERE id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  v_location := v_user.assigned_location;

  IF p_session_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.cash_sessions
      WHERE id = p_session_id AND status = 'open'
    ) THEN
      RAISE EXCEPTION 'La caja no tiene una sesión abierta';
    END IF;
  END IF;

  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'El ticket no tiene productos';
  END IF;

  IF COALESCE(p_ticket_number, '') = '' THEN
    p_ticket_number := 'T-' || LPAD(nextval('public.ticket_seq')::TEXT, 6, '0');
  END IF;

  INSERT INTO public.tickets (
    ticket_number, register_id, session_id, user_id, user_name,
    payment_method, payment_detail, subtotal, discount_total, total,
    cash_received, change_given, invoice_type,
    customer_name, customer_doc_type, customer_doc,
    fiscal_status, cae, cae_vto, invoice_number
  ) VALUES (
    p_ticket_number, p_register_id, p_session_id, v_user.id, v_user.full_name,
    p_payment_method, COALESCE(p_payment_detail, ''),
    COALESCE(p_subtotal, 0), COALESCE(p_discount_total, 0), COALESCE(p_total, 0),
    COALESCE(p_cash_received, 0), COALESCE(p_change_given, 0),
    COALESCE(p_invoice_type, 'ticket'),
    COALESCE(p_customer_name, ''), COALESCE(p_customer_doc_type, ''), COALESCE(p_customer_doc, ''),
    COALESCE(p_fiscal_status, 'none'), COALESCE(p_cae, ''), COALESCE(p_cae_vto, ''), COALESCE(p_invoice_number, '')
  ) RETURNING id INTO v_ticket_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_qty := GREATEST(1, COALESCE((v_item->>'qty')::INTEGER, 1));
    v_unit := COALESCE((v_item->>'unit_price')::NUMERIC, 0);
    v_discount := COALESCE((v_item->>'discount_amount')::NUMERIC, 0);

    SELECT * INTO v_product FROM public.products
      WHERE id = (v_item->>'product_id')::UUID
      FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Producto no encontrado';
    END IF;

    IF v_unit <= 0 THEN
      v_unit := v_product.public_price;
    END IF;

    IF v_location = 'local1' THEN
      IF v_product.stock_local_1 < v_qty THEN
        RAISE EXCEPTION 'Stock insuficiente en Local 1 para "%". Disponible: %', v_product.name, v_product.stock_local_1;
      END IF;
      UPDATE public.products SET stock_local_1 = stock_local_1 - v_qty WHERE id = v_product.id;
    ELSIF v_location = 'local2' THEN
      IF v_product.stock_local_2 < v_qty THEN
        RAISE EXCEPTION 'Stock insuficiente en Local 2 para "%". Disponible: %', v_product.name, v_product.stock_local_2;
      END IF;
      UPDATE public.products SET stock_local_2 = stock_local_2 - v_qty WHERE id = v_product.id;
    ELSE
      IF v_product.stock_deposito < v_qty THEN
        RAISE EXCEPTION 'Stock insuficiente en Depósito para "%". Disponible: %', v_product.name, v_product.stock_deposito;
      END IF;
      UPDATE public.products SET stock_deposito = stock_deposito - v_qty WHERE id = v_product.id;
    END IF;

    INSERT INTO public.sales (
      product_id, product_name, qty, unit_price, cost_price,
      payment_method, payment_detail, user_id, user_name,
      ticket_id, discount_amount, register_id, session_id
    ) VALUES (
      v_product.id, v_product.name, v_qty, v_unit, v_product.cost_price,
      p_payment_method, COALESCE(p_payment_detail, ''), v_user.id, v_user.full_name,
      v_ticket_id, v_discount, p_register_id, p_session_id
    ) RETURNING id INTO v_sale_id;

    v_sale_ids := array_append(v_sale_ids, v_sale_id);
  END LOOP;

  IF p_payment_method = 'efectivo' AND p_session_id IS NOT NULL THEN
    INSERT INTO public.cash_movements (session_id, type, amount, note)
    VALUES (p_session_id, 'cash_sale', COALESCE(p_total, 0), 'Venta ' || COALESCE(p_ticket_number, v_ticket_id::TEXT));
  END IF;

  RETURN json_build_object(
    'success', true,
    'ticket_id', v_ticket_id,
    'ticket_number', p_ticket_number,
    'sale_ids', v_sale_ids
  );
END;
$$;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
