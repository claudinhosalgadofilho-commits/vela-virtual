
-- Fix mutable search_path on set_updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Restrict SECURITY DEFINER function execution
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
-- has_role is safe for authenticated (only reveals own roles via SELECT policies elsewhere), keep it callable

-- Tighten orders INSERT policy: require non-empty required fields (avoids spam empties)
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
CREATE POLICY "Anyone can create orders" ON public.orders FOR INSERT
WITH CHECK (
  length(customer_name) > 0
  AND length(customer_email) > 3
  AND length(tribute_name) > 0
  AND amount_cents > 0
);
