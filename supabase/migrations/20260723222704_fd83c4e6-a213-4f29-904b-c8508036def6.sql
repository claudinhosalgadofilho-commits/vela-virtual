
ALTER TABLE public.candles ADD COLUMN IF NOT EXISTS duration_minutes INT;
UPDATE public.candles SET duration_minutes = duration_hours * 60 WHERE duration_minutes IS NULL;
UPDATE public.candles SET duration_minutes = 60 WHERE name = 'Vela 60 Minutos';
ALTER TABLE public.candles ALTER COLUMN duration_minutes SET NOT NULL;
ALTER TABLE public.candles ADD CONSTRAINT candles_duration_minutes_positive CHECK (duration_minutes > 0);
