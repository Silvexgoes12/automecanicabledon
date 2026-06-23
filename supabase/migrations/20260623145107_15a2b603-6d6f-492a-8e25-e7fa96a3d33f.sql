-- Remover sistema de aprovação de cadastros
DROP TRIGGER IF EXISTS on_auth_user_created_approval ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_approval();
DROP FUNCTION IF EXISTS public.is_user_approved(uuid);
DROP TABLE IF EXISTS public.user_approvals;

-- Garantir que apenas financeiro@plinenergia.com.br seja admin
DELETE FROM public.app_admins WHERE lower(email) <> 'financeiro@plinenergia.com.br';
INSERT INTO public.app_admins (email) VALUES ('financeiro@plinenergia.com.br')
ON CONFLICT DO NOTHING;