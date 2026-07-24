
ALTER TABLE public.tributes
  ADD COLUMN IF NOT EXISTS like_count INTEGER NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.increment_tribute_like(_tribute_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count integer;
BEGIN
  UPDATE public.tributes
     SET like_count = like_count + 1
   WHERE id = _tribute_id AND active = true
  RETURNING like_count INTO v_count;
  RETURN v_count;
END; $$;

CREATE OR REPLACE FUNCTION public.decrement_tribute_like(_tribute_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count integer;
BEGIN
  UPDATE public.tributes
     SET like_count = GREATEST(like_count - 1, 0)
   WHERE id = _tribute_id AND active = true
  RETURNING like_count INTO v_count;
  RETURN v_count;
END; $$;

REVOKE ALL ON FUNCTION public.increment_tribute_like(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.decrement_tribute_like(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_tribute_like(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_tribute_like(uuid) TO anon, authenticated;
