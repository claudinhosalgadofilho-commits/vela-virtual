ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS renewal_tribute_id UUID REFERENCES public.tributes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS orders_renewal_tribute_id_idx
  ON public.orders(renewal_tribute_id)
  WHERE renewal_tribute_id IS NOT NULL;

-- Permitir que homenagens encerradas continuem visíveis (para exibir a opção de prorrogar).
DROP POLICY IF EXISTS "Public can view active tributes" ON public.tributes;
CREATE POLICY "Public can view tributes"
  ON public.tributes
  FOR SELECT
  USING (active = true);
