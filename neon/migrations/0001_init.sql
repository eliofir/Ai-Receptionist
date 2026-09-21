-- ============================================================================
-- Ophir Insurance — virtual receptionist backend (Neon Data API / Postgres).
-- Idempotent: re-applied on every build. Content rows live in neon/seed.json.
-- ============================================================================

-- is_admin(): true when the signed-in user's Neon Auth role is 'admin'.
-- MUST be defined before any policy that calls it. plpgsql + dynamic EXECUTE
-- defers resolution of neon_auth."user" (which may not exist at migration time).
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $fn$
DECLARE ok boolean;
BEGIN
  EXECUTE 'SELECT EXISTS (SELECT 1 FROM neon_auth."user" u
    WHERE u.id::text = auth.user_id() AND u.role = ''admin''
    AND coalesce(u.banned, false) = false)' INTO ok;
  RETURN COALESCE(ok, false);
EXCEPTION WHEN undefined_table OR undefined_function THEN
  RETURN false;
END $fn$;

-- ── PUBLIC CONTENT: knowledge base (assistant + FAQ page) ───────────────────
CREATE TABLE IF NOT EXISTS public.knowledge_base (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       TEXT UNIQUE NOT NULL,
  topic      TEXT NOT NULL,
  question   TEXT NOT NULL,
  answer     TEXT NOT NULL,
  keywords   TEXT[] NOT NULL DEFAULT '{}',
  sort_order INT NOT NULL DEFAULT 0
);
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.knowledge_base TO anonymous, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.knowledge_base TO authenticated;
DROP POLICY IF EXISTS kb_public_read ON public.knowledge_base;
CREATE POLICY kb_public_read ON public.knowledge_base FOR SELECT USING (true);
DROP POLICY IF EXISTS kb_admin_ins ON public.knowledge_base;
CREATE POLICY kb_admin_ins ON public.knowledge_base FOR INSERT TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS kb_admin_upd ON public.knowledge_base;
CREATE POLICY kb_admin_upd ON public.knowledge_base FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS kb_admin_del ON public.knowledge_base;
CREATE POLICY kb_admin_del ON public.knowledge_base FOR DELETE TO authenticated USING (public.is_admin());

-- ── PUBLIC CONTENT: site info (about copy, contact details) ─────────────────
CREATE TABLE IF NOT EXISTS public.site_info (
  id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key   TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL
);
ALTER TABLE public.site_info ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.site_info TO anonymous, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.site_info TO authenticated;
DROP POLICY IF EXISTS site_info_public_read ON public.site_info;
CREATE POLICY site_info_public_read ON public.site_info FOR SELECT USING (true);
DROP POLICY IF EXISTS site_info_admin_ins ON public.site_info;
CREATE POLICY site_info_admin_ins ON public.site_info FOR INSERT TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS site_info_admin_upd ON public.site_info;
CREATE POLICY site_info_admin_upd ON public.site_info FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS site_info_admin_del ON public.site_info;
CREATE POLICY site_info_admin_del ON public.site_info FOR DELETE TO authenticated USING (public.is_admin());

-- ── LEADS: public may submit, only admins may read/update/delete ────────────
CREATE TABLE IF NOT EXISTS public.leads (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference      TEXT UNIQUE NOT NULL,
  full_name      TEXT NOT NULL,
  phone          TEXT NOT NULL,
  email          TEXT NOT NULL,
  insurance_type TEXT NOT NULL DEFAULT 'Other',
  message        TEXT,
  source         TEXT NOT NULL DEFAULT 'quote',
  status         TEXT NOT NULL DEFAULT 'New',
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
GRANT INSERT ON public.leads TO anonymous, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.leads TO authenticated;
DROP POLICY IF EXISTS leads_public_insert ON public.leads;
CREATE POLICY leads_public_insert ON public.leads FOR INSERT TO anonymous, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS leads_admin_read ON public.leads;
CREATE POLICY leads_admin_read ON public.leads FOR SELECT TO authenticated USING (public.is_admin());
DROP POLICY IF EXISTS leads_admin_update ON public.leads;
CREATE POLICY leads_admin_update ON public.leads FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS leads_admin_delete ON public.leads;
CREATE POLICY leads_admin_delete ON public.leads FOR DELETE TO authenticated USING (public.is_admin());

-- ── APPOINTMENTS: public may submit, only admins may read/update/delete ─────
CREATE TABLE IF NOT EXISTS public.appointments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference        TEXT UNIQUE NOT NULL,
  full_name        TEXT NOT NULL,
  phone            TEXT NOT NULL,
  email            TEXT NOT NULL,
  service_type     TEXT NOT NULL,
  appointment_date DATE NOT NULL,
  time_slot        TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'Pending',
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
GRANT INSERT ON public.appointments TO anonymous, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.appointments TO authenticated;
DROP POLICY IF EXISTS appt_public_insert ON public.appointments;
CREATE POLICY appt_public_insert ON public.appointments FOR INSERT TO anonymous, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS appt_admin_read ON public.appointments;
CREATE POLICY appt_admin_read ON public.appointments FOR SELECT TO authenticated USING (public.is_admin());
DROP POLICY IF EXISTS appt_admin_update ON public.appointments;
CREATE POLICY appt_admin_update ON public.appointments FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS appt_admin_delete ON public.appointments;
CREATE POLICY appt_admin_delete ON public.appointments FOR DELETE TO authenticated USING (public.is_admin());

-- ── PUBLIC availability view: exposes ONLY date + slot (no personal data) ───
CREATE OR REPLACE VIEW public.booked_slots WITH (security_invoker = false) AS
  SELECT appointment_date, time_slot
  FROM public.appointments
  WHERE status <> 'Cancelled';
GRANT SELECT ON public.booked_slots TO anonymous, authenticated;
