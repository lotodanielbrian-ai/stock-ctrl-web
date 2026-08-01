-- ============================================
-- Migration 006: Update Sale Payment Method
-- ============================================

-- Function to update the payment method of multiple sales at once
CREATE OR REPLACE FUNCTION public.update_sale_payment(
  p_sale_ids UUID[],
  p_payment_method payment_method
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF array_length(p_sale_ids, 1) IS NULL OR array_length(p_sale_ids, 1) = 0 THEN
    RETURN json_build_object('success', true, 'updated', 0);
  END IF;

  UPDATE public.sales
  SET payment_method = p_payment_method
  WHERE id = ANY(p_sale_ids);

  GET DIAGNOSTICS v_count = ROW_COUNT;

  NOTIFY pgrst, 'reload schema';

  RETURN json_build_object(
    'success', true,
    'updated', v_count
  );
END;
$$;
