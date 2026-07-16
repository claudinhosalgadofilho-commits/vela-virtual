
-- 1. Remove política pública em orders (dados sensíveis de clientes e pagamento)
--    Leitura pública nunca foi necessária: getOrderStatus roda no servidor
--    com supabaseAdmin, e as páginas admin já têm política has_role.
DROP POLICY IF EXISTS "Anyone can view orders by id" ON public.orders;

-- 2. Restringir EXECUTE nas funções SECURITY DEFINER
--    has_role: usada em RLS, precisa continuar chamável por authenticated,
--    mas não por anon.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- Funções que são apenas triggers — ninguém deve chamá-las via API.
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.orders_forbid_status_regression() FROM PUBLIC, anon, authenticated;
