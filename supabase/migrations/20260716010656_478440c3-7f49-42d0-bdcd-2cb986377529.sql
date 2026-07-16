
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Função que cancela pedidos pendentes com mais de 24h.
-- SECURITY DEFINER para rodar independentemente do papel do cron, com search_path fixo.
CREATE OR REPLACE FUNCTION public.cleanup_stale_pending_orders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected integer;
BEGIN
  UPDATE public.orders
     SET status = 'cancelled'
   WHERE status = 'pending'
     AND created_at < now() - interval '24 hours';
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

-- Só o cron (postgres) e service_role executam. Ninguém via API.
REVOKE EXECUTE ON FUNCTION public.cleanup_stale_pending_orders() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_stale_pending_orders() TO service_role;

-- Índice parcial para o filtro ficar barato mesmo com muitos pedidos históricos.
CREATE INDEX IF NOT EXISTS idx_orders_pending_created_at
  ON public.orders (created_at)
  WHERE status = 'pending';

-- Remove agendamento antigo se existir, para poder re-executar a migration.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-stale-pending-orders') THEN
    PERFORM cron.unschedule('cleanup-stale-pending-orders');
  END IF;
END $$;

-- Agenda: a cada hora, no minuto 5.
SELECT cron.schedule(
  'cleanup-stale-pending-orders',
  '5 * * * *',
  $$ SELECT public.cleanup_stale_pending_orders(); $$
);
