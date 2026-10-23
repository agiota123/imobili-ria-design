-- Secure baseline for a dedicated Supabase project per customer.
-- Apply before storing real data. Administrators are always assigned deliberately.

DO $$
BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

CREATE TABLE IF NOT EXISTS public.properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL DEFAULT '',
  title text NOT NULL,
  code text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'Casa',
  purpose text NOT NULL DEFAULT 'Venda',
  price numeric NOT NULL DEFAULT 0,
  condo numeric NOT NULL DEFAULT 0,
  iptu numeric NOT NULL DEFAULT 0,
  description text NOT NULL DEFAULT '',
  state text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  neighborhood text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  number text NOT NULL DEFAULT '',
  zip text NOT NULL DEFAULT '',
  complement text NOT NULL DEFAULT '',
  area numeric NOT NULL DEFAULT 0,
  built_area numeric NOT NULL DEFAULT 0,
  bedrooms integer NOT NULL DEFAULT 0,
  suites integer NOT NULL DEFAULT 0,
  bathrooms integer NOT NULL DEFAULT 0,
  parking integer NOT NULL DEFAULT 0,
  features text[] NOT NULL DEFAULT '{}',
  published boolean NOT NULL DEFAULT false,
  featured boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'Disponível',
  images text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- Remove unsafe automatic first-admin registration, if present from an earlier version.
DROP TRIGGER IF EXISTS on_auth_user_created_admin ON auth.users;
DROP FUNCTION IF EXISTS public.handle_first_admin();
DROP FUNCTION IF EXISTS public.admin_exists();

DROP POLICY IF EXISTS "Public reads published" ON public.properties;
DROP POLICY IF EXISTS "Admins read all" ON public.properties;
DROP POLICY IF EXISTS "Admins insert" ON public.properties;
DROP POLICY IF EXISTS "Admins update" ON public.properties;
DROP POLICY IF EXISTS "Admins delete" ON public.properties;
DROP POLICY IF EXISTS properties_public_read ON public.properties;
DROP POLICY IF EXISTS properties_admin_read ON public.properties;
DROP POLICY IF EXISTS properties_admin_insert ON public.properties;
DROP POLICY IF EXISTS properties_admin_update ON public.properties;
DROP POLICY IF EXISTS properties_admin_delete ON public.properties;
DROP POLICY IF EXISTS "Users read own roles" ON public.user_roles;
DROP POLICY IF EXISTS user_roles_select_own ON public.user_roles;

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles AS roles
    WHERE roles.user_id = (SELECT auth.uid())
      AND roles.role = 'admin'::public.app_role
  );
$function$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

REVOKE ALL ON public.user_roles FROM anon, authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

CREATE POLICY user_roles_select_own
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

REVOKE ALL ON public.properties FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.properties TO authenticated;
GRANT ALL ON public.properties TO service_role;

CREATE POLICY properties_admin_read
  ON public.properties FOR SELECT TO authenticated
  USING (public.is_admin());
CREATE POLICY properties_admin_insert
  ON public.properties FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());
CREATE POLICY properties_admin_update
  ON public.properties FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY properties_admin_delete
  ON public.properties FOR DELETE TO authenticated
  USING (public.is_admin());

-- Published listings are exposed through this view, without exact-address fields.
CREATE OR REPLACE VIEW public.public_properties
WITH (security_barrier = true)
AS
SELECT id, slug, title, code, type, purpose, price, condo, iptu, description,
       state, city, neighborhood, area, built_area, bedrooms, suites, bathrooms,
       parking, features, published, featured, status, images, created_at
FROM public.properties
WHERE published = true;

REVOKE ALL ON public.public_properties FROM PUBLIC;
GRANT SELECT ON public.public_properties TO anon, authenticated;

CREATE INDEX IF NOT EXISTS properties_published_created_at_idx
  ON public.properties (published, created_at DESC);
DROP INDEX IF EXISTS public.properties_slug_unique;
CREATE INDEX IF NOT EXISTS properties_slug_idx ON public.properties (slug);

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;
DROP TRIGGER IF EXISTS properties_touch ON public.properties;
CREATE TRIGGER properties_touch BEFORE UPDATE ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('property-images', 'property-images', true, 10485760,
        ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public can read property images" ON storage.objects;
DROP POLICY IF EXISTS "Admins upload property images" ON storage.objects;
DROP POLICY IF EXISTS "Admins update property images" ON storage.objects;
DROP POLICY IF EXISTS "Admins delete property images" ON storage.objects;

CREATE POLICY "Public can read property images"
  ON storage.objects FOR SELECT TO public USING (bucket_id = 'property-images');
CREATE POLICY "Admins upload property images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'property-images' AND public.is_admin());
CREATE POLICY "Admins update property images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'property-images' AND public.is_admin())
  WITH CHECK (bucket_id = 'property-images' AND public.is_admin());
CREATE POLICY "Admins delete property images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'property-images' AND public.is_admin());

COMMENT ON VIEW public.public_properties IS
  'Published public listing fields only; exact-address fields stay in public.properties.';
