
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS tribute_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS tribute_birth_date DATE,
  ADD COLUMN IF NOT EXISTS tribute_death_date DATE;

ALTER TABLE public.tributes
  ADD COLUMN IF NOT EXISTS tribute_birth_date DATE,
  ADD COLUMN IF NOT EXISTS tribute_death_date DATE;
