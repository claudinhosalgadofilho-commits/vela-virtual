
ALTER TABLE public.condolences
  ADD COLUMN IF NOT EXISTS like_count integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.increment_condolence_like(_condolence_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count integer;
BEGIN
  UPDATE public.condolences c
     SET like_count = like_count + 1
   WHERE c.id = _condolence_id
     AND c.approved = true
     AND EXISTS (
       SELECT 1 FROM public.tributes t
        WHERE t.id = c.tribute_id AND t.active = true AND t.ends_at > now()
     )
  RETURNING like_count INTO v_count;
  RETURN v_count;
END; $$;

CREATE OR REPLACE FUNCTION public.decrement_condolence_like(_condolence_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count integer;
BEGIN
  UPDATE public.condolences c
     SET like_count = GREATEST(like_count - 1, 0)
   WHERE c.id = _condolence_id
     AND c.approved = true
     AND EXISTS (
       SELECT 1 FROM public.tributes t
        WHERE t.id = c.tribute_id AND t.active = true AND t.ends_at > now()
     )
  RETURNING like_count INTO v_count;
  RETURN v_count;
END; $$;

REVOKE EXECUTE ON FUNCTION public.increment_condolence_like(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.decrement_condolence_like(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_condolence_like(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_condolence_like(uuid) TO anon, authenticated;
