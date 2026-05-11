
-- Add sync columns to lancamentos
ALTER TABLE public.lancamentos
  ADD COLUMN IF NOT EXISTS sync_external_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Trigger to keep updated_at fresh
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;$$;

DROP TRIGGER IF EXISTS set_updated_at_lancamentos ON public.lancamentos;
CREATE TRIGGER set_updated_at_lancamentos
BEFORE UPDATE ON public.lancamentos
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Sheets config table
CREATE TABLE IF NOT EXISTS public.sheets_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  spreadsheet_id text NOT NULL,
  sheet_name text NOT NULL DEFAULT 'Lancamentos',
  last_sync_at timestamptz,
  last_sync_summary jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE public.sheets_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sheets_config_owner_all ON public.sheets_config;
CREATE POLICY sheets_config_owner_all ON public.sheets_config
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP TRIGGER IF EXISTS set_updated_at_sheets_config ON public.sheets_config;
CREATE TRIGGER set_updated_at_sheets_config
BEFORE UPDATE ON public.sheets_config
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
