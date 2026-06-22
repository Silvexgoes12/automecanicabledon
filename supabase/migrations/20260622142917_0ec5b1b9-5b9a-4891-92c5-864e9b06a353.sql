
-- Approval system for new accounts
CREATE TABLE public.user_approvals (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','aprovado','rejeitado')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at TIMESTAMPTZ,
  decided_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.user_approvals TO authenticated;
GRANT ALL ON public.user_approvals TO service_role;

ALTER TABLE public.user_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own approval" ON public.user_approvals
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_app_admin(auth.uid()));

CREATE POLICY "admins update approvals" ON public.user_approvals
  FOR UPDATE TO authenticated
  USING (public.is_app_admin(auth.uid()))
  WITH CHECK (public.is_app_admin(auth.uid()));

CREATE TRIGGER trg_user_approvals_updated_at
  BEFORE UPDATE ON public.user_approvals
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Is the user approved (or admin)?
CREATE OR REPLACE FUNCTION public.is_user_approved(_uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_app_admin(_uid)
    OR EXISTS (
      SELECT 1 FROM public.user_approvals
      WHERE user_id = _uid AND status = 'aprovado'
    );
$$;

-- Auto-create approval row when a new auth user is created.
-- Auto-approve if email is in app_admins.
CREATE OR REPLACE FUNCTION public.handle_new_user_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.app_admins a
    WHERE lower(a.email) = lower(NEW.email)
  ) INTO v_is_admin;

  INSERT INTO public.user_approvals (user_id, email, status, decided_at)
  VALUES (
    NEW.id,
    NEW.email,
    CASE WHEN v_is_admin THEN 'aprovado' ELSE 'pendente' END,
    CASE WHEN v_is_admin THEN now() ELSE NULL END
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_approval
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_approval();

-- Backfill existing users (approve admins, leave others pending — admin can decide)
INSERT INTO public.user_approvals (user_id, email, status, decided_at)
SELECT
  u.id,
  u.email,
  CASE WHEN EXISTS (SELECT 1 FROM public.app_admins a WHERE lower(a.email) = lower(u.email))
       THEN 'aprovado' ELSE 'aprovado' END, -- approve all existing users so we don't lock anyone out
  now()
FROM auth.users u
ON CONFLICT (user_id) DO NOTHING;
