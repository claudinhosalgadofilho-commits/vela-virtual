
-- Livro de condolências: mensagens públicas em cada homenagem
CREATE TABLE public.condolences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tribute_id UUID NOT NULL REFERENCES public.tributes(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL CHECK (char_length(trim(author_name)) BETWEEN 1 AND 80),
  message TEXT NOT NULL CHECK (char_length(trim(message)) BETWEEN 1 AND 1000),
  approved BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_condolences_tribute_id ON public.condolences(tribute_id, created_at DESC);

GRANT SELECT, INSERT ON public.condolences TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.condolences TO authenticated;
GRANT ALL ON public.condolences TO service_role;

ALTER TABLE public.condolences ENABLE ROW LEVEL SECURITY;

-- Qualquer visitante pode ler mensagens aprovadas de homenagens ativas
CREATE POLICY "Public can read approved condolences of active tributes"
  ON public.condolences FOR SELECT
  USING (
    approved = true
    AND EXISTS (
      SELECT 1 FROM public.tributes t
      WHERE t.id = tribute_id AND t.active = true AND t.ends_at > now()
    )
  );

-- Qualquer visitante pode enviar mensagem em homenagens ativas
CREATE POLICY "Public can insert condolences on active tributes"
  ON public.condolences FOR INSERT
  WITH CHECK (
    approved = true
    AND EXISTS (
      SELECT 1 FROM public.tributes t
      WHERE t.id = tribute_id AND t.active = true AND t.ends_at > now()
    )
  );

-- Admins podem gerenciar (moderar/excluir) qualquer mensagem
CREATE POLICY "Admins can manage all condolences"
  ON public.condolences FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_condolences_updated_at
  BEFORE UPDATE ON public.condolences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
