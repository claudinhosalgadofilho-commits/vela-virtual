
CREATE TABLE public.webhook_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'mercadopago',
  event_type TEXT,
  payment_id TEXT,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  status_code INT NOT NULL,
  result TEXT NOT NULL,
  mp_status TEXT,
  signature_ok BOOLEAN,
  raw_body JSONB,
  headers JSONB,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX webhook_events_created_at_idx ON public.webhook_events (created_at DESC);
CREATE INDEX webhook_events_order_id_idx ON public.webhook_events (order_id);

GRANT SELECT ON public.webhook_events TO authenticated;
GRANT ALL ON public.webhook_events TO service_role;

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view webhook events"
  ON public.webhook_events
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
