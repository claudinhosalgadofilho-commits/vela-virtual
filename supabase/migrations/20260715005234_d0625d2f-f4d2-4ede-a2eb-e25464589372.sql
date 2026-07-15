UPDATE public.candles SET name = 'Vela Virtual' WHERE name = 'Vela Santa Luzia';

UPDATE public.settings
SET company_name = REPLACE(company_name, ' Santa Luzia', ''),
    seo_title = REPLACE(seo_title, ' Santa Luzia', ''),
    seo_description = REPLACE(seo_description, ' Santa Luzia', '');