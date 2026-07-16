ALTER PUBLICATION supabase_realtime ADD TABLE public.condolences;
ALTER TABLE public.condolences REPLICA IDENTITY FULL;