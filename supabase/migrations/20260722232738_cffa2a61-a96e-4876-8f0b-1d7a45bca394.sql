
-- 1) Restrict public SELECT on tributes to active + non-expired
DROP POLICY IF EXISTS "Anyone can view tributes" ON public.tributes;
CREATE POLICY "Public can view active tributes"
  ON public.tributes
  FOR SELECT
  TO public
  USING (active = true AND ends_at > now());

-- 2) Storage: restrict tribute-photos bucket to admins only
DROP POLICY IF EXISTS "Admins can read tribute photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can write tribute photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update tribute photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete tribute photos" ON storage.objects;

CREATE POLICY "Admins can read tribute photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'tribute-photos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can write tribute photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'tribute-photos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update tribute photos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'tribute-photos' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'tribute-photos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete tribute photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'tribute-photos' AND public.has_role(auth.uid(), 'admin'));

-- 3) Revoke EXECUTE on SECURITY DEFINER functions from public/anon/authenticated
-- Trigger-only functions should never be called directly.
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.orders_forbid_status_regression() FROM PUBLIC, anon, authenticated;

-- Maintenance function — service_role / cron only
REVOKE ALL ON FUNCTION public.cleanup_stale_pending_orders() FROM PUBLIC, anon, authenticated;

-- has_role is used by RLS policies; keep authenticated EXECUTE, revoke from anon/public
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
