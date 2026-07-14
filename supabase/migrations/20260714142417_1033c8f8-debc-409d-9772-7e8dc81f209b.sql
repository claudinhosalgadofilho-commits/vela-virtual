
UPDATE public.candles SET active = false WHERE slug IN ('vela-luz-da-fe','vela-luz-perene');
UPDATE public.candles
SET name = 'Vela Santa Luzia',
    slug = 'vela-santa-luzia',
    price_cents = 199,
    duration_hours = 216,
    description = 'Acenda uma vela virtual em memória de quem você ama. Sua chama permanecerá acesa por 9 dias.',
    display_order = 1,
    active = true
WHERE slug = 'vela-luz-eterna';
UPDATE public.settings SET
  company_name = 'Vela Virtual Santa Luzia',
  seo_title = 'Vela Virtual Santa Luzia — Acenda uma luz, eternize uma memória',
  seo_description = 'Preste sua homenagem acendendo uma vela virtual e deixe uma mensagem de conforto à família.'
WHERE id = 1;
