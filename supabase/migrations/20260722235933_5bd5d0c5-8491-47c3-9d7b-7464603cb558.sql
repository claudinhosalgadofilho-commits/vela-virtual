DROP POLICY IF EXISTS "Anyone can view active candles" ON public.candles;
CREATE POLICY "Anyone can view active candles"
ON public.candles FOR SELECT TO public
USING (active = true);