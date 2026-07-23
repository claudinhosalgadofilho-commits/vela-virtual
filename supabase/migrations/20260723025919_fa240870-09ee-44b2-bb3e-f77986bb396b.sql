
ALTER TABLE public.tributes ADD COLUMN IF NOT EXISTS lit_at timestamptz;

CREATE OR REPLACE FUNCTION public.light_tribute(_tribute_id uuid)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lit timestamptz;
BEGIN
  UPDATE public.tributes
     SET lit_at = COALESCE(lit_at, now())
   WHERE id = _tribute_id
     AND active = true
     AND ends_at > now()
  RETURNING lit_at INTO v_lit;
  RETURN v_lit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.light_tribute(uuid) TO anon, authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.tributes;
