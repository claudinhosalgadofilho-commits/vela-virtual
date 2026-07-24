
-- 1) Remove blanket public SELECT on tribute-photos bucket. All reads use signed URLs.
DROP POLICY IF EXISTS "Public can read tribute photos" ON storage.objects;

-- 2) Harden SECURITY DEFINER functions: revoke default PUBLIC EXECUTE
-- and grant explicitly to the minimum roles that actually need it.
REVOKE EXECUTE ON FUNCTION public.light_tribute(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_tribute_like(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.decrement_tribute_like(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_stale_pending_orders() FROM PUBLIC;

-- Tribute interactions are intentionally open to anonymous visitors.
GRANT EXECUTE ON FUNCTION public.light_tribute(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_tribute_like(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_tribute_like(uuid) TO anon, authenticated;

-- Role check only needs to run for signed-in users (RLS policies + admin gates).
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- Maintenance job runs from the server / cron only.
GRANT EXECUTE ON FUNCTION public.cleanup_stale_pending_orders() TO service_role;
