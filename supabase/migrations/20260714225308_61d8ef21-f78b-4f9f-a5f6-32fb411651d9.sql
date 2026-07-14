
-- Idempotency guards for Mercado Pago webhook
DROP INDEX IF EXISTS public.orders_mp_payment_id_idx;
CREATE UNIQUE INDEX orders_mp_payment_id_uniq ON public.orders (mp_payment_id) WHERE mp_payment_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS tributes_order_id_uniq ON public.tributes (order_id);
CREATE INDEX IF NOT EXISTS tributes_candle_id_idx ON public.tributes (candle_id);

-- Forbid regressing terminal statuses (paid/cancelled cannot go back to pending)
CREATE OR REPLACE FUNCTION public.orders_forbid_status_regression()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.status IN ('paid','cancelled','refunded') AND NEW.status <> OLD.status THEN
    -- Only allow paid -> refunded
    IF NOT (OLD.status = 'paid' AND NEW.status = 'refunded') THEN
      RAISE EXCEPTION 'invalid status transition: % -> %', OLD.status, NEW.status;
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS orders_status_guard ON public.orders;
CREATE TRIGGER orders_status_guard
  BEFORE UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.orders_forbid_status_regression();
