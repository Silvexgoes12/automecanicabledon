
-- Admin allow-list by email
CREATE TABLE public.app_admins (
  email TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.app_admins TO authenticated;
GRANT ALL ON public.app_admins TO service_role;
ALTER TABLE public.app_admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins readable by authenticated" ON public.app_admins FOR SELECT TO authenticated USING (true);

INSERT INTO public.app_admins (email) VALUES ('financeiro@plinenergia.com.br');

-- Helper function
CREATE OR REPLACE FUNCTION public.is_app_admin(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.app_admins a
    JOIN auth.users u ON lower(u.email) = lower(a.email)
    WHERE u.id = _uid
  );
$$;

-- Tickets
CREATE TABLE public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('duvida','feedback')),
  assunto TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto','respondido','resolvido')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tickets select own or admin" ON public.support_tickets
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_app_admin(auth.uid()));
CREATE POLICY "tickets insert own" ON public.support_tickets
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tickets update admin" ON public.support_tickets
  FOR UPDATE TO authenticated
  USING (public.is_app_admin(auth.uid()))
  WITH CHECK (public.is_app_admin(auth.uid()));

CREATE TRIGGER trg_support_tickets_updated
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Messages
CREATE TABLE public.support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  mensagem TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.support_messages TO authenticated;
GRANT ALL ON public.support_messages TO service_role;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages select ticket scope" ON public.support_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id
        AND (t.user_id = auth.uid() OR public.is_app_admin(auth.uid()))
    )
  );

CREATE POLICY "messages insert scope" ON public.support_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      public.is_app_admin(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.support_tickets t
        WHERE t.id = ticket_id
          AND t.user_id = auth.uid()
          AND t.tipo = 'duvida'
          AND t.status <> 'resolvido'
      )
    )
    AND (is_admin = public.is_app_admin(auth.uid()))
  );

CREATE INDEX ix_support_messages_ticket ON public.support_messages(ticket_id, created_at);
CREATE INDEX ix_support_tickets_user ON public.support_tickets(user_id, created_at DESC);
