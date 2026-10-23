# Secure admin setup

This repository is a code template. Each company needs its own Supabase project. Copying the repository does not copy databases, files, user accounts, or credentials.

## 1. Create a separate Supabase project for this company

1. Create a dedicated Supabase project.
2. Run supabase/migrations/20261023000000_secure_admin_baseline.sql in the Supabase SQL Editor.
3. Disable public signups in Authentication. The site supports login and password recovery, not public admin registration.
4. Create or invite the administrator in Authentication > Users.
5. Grant the role to that existing account using the SQL below, replacing the email:

    INSERT INTO public.user_roles (user_id, role)
    SELECT id, 'admin'::public.app_role
    FROM auth.users
    WHERE lower(email) = lower('admin@empresa.com')
    ON CONFLICT (user_id, role) DO NOTHING;

If no row is inserted, confirm the account already exists under Authentication > Users. Never enable open registration to create an admin.

## 2. Configure environment variables

Use .env.example for local development. In Vercel, add these variables for the desired environment and redeploy:

- VITE_SUPABASE_URL
- VITE_SUPABASE_PUBLISHABLE_KEY
- SUPABASE_URL
- SUPABASE_PUBLISHABLE_KEY

Set them to the matching customer's own project. The publishable/anon key may be in the browser because access is enforced by RLS; it is not an admin password.

Never expose SUPABASE_SERVICE_ROLE_KEY in the frontend or a VITE_ variable. This template does not need that key for its browser data flow.

## 3. Password recovery

Configure the site's public URL and its production/preview redirect URLs in Authentication > URL Configuration. Password recovery returns to /reset-password.

## 4. Isolate customers

Every company must have its own Supabase project, URL, keys, users, database and Storage. Configure each repository/deployment to point only at that company's project. Never reuse credentials across clients.

## 5. Included safeguards

- /admin verifies a valid session and an admin role stored in the database.
- Public signup does not automatically grant an admin role.
- The full properties table only grants access to admins through RLS.
- The public_properties view contains only published listings and excludes exact street address, number, postal code and complement.
- Property images can be read publicly; uploads, updates and deletions require the admin role.

The login screen can be previewed before configuration, but real authentication and persistence only work after the migration and environment variables are in place. Test permissions and recovery before using real data.
