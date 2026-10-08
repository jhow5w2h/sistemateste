ALTER TABLE public.settings ADD COLUMN atleticas text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.orders ADD COLUMN atletica text;
CREATE OR REPLACE FUNCTION public.set_order_atletica(_order_id uuid, _atletica text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.orders SET atletica = NULLIF(trim(_atletica), '')
  WHERE id = _order_id AND user_id = auth.uid();
END $$;
GRANT EXECUTE ON FUNCTION public.set_order_atletica(uuid, text) TO authenticated;