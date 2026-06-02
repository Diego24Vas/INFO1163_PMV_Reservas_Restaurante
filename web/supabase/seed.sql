-- ============================================================
-- SCHEMA MIGRATION: Add missing columns to mesas
-- ============================================================
ALTER TABLE mesas ADD COLUMN IF NOT EXISTS ultimo_cambio_estado timestamptz;
ALTER TABLE mesas ADD COLUMN IF NOT EXISTS asignado_a uuid;
ALTER TABLE mesas ADD COLUMN IF NOT EXISTS comensales integer;
ALTER TABLE mesas ADD COLUMN IF NOT EXISTS grupo_fusion text;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'mesas_asignado_a_fkey') THEN
        ALTER TABLE mesas ADD CONSTRAINT mesas_asignado_a_fkey FOREIGN KEY (asignado_a) REFERENCES perfiles(id) DEFERRABLE INITIALLY IMMEDIATE;
    END IF;
END $$;

-- ============================================================
-- UPDATE RLS: Replace anon policies with authenticated
-- ============================================================
DROP POLICY IF EXISTS "Allow all anon on roles" ON roles;
DROP POLICY IF EXISTS "Allow all anon on perfiles" ON perfiles;
DROP POLICY IF EXISTS "Allow all anon on zonas" ON zonas;
DROP POLICY IF EXISTS "Allow all anon on mesas" ON mesas;
DROP POLICY IF EXISTS "Allow all anon on sesiones_registro" ON sesiones_registro;
DROP POLICY IF EXISTS "Allow all anon on pedidos" ON pedidos;
DROP POLICY IF EXISTS "Allow all anon on limpiezas" ON limpiezas;
DROP POLICY IF EXISTS "Allow all anon on elementos_topologia" ON elementos_topologia;
DROP POLICY IF EXISTS "Allow all anon on system_config" ON system_config;

ALTER TABLE IF EXISTS roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sesiones_registro ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS limpiezas ENABLE ROW LEVEL SECURITY;

-- Policies are already created in migrations

-- ============================================================
-- SEED: Roles
-- ============================================================
INSERT INTO roles (nombre) VALUES ('Administrador') ON CONFLICT (nombre) DO NOTHING;
INSERT INTO roles (nombre) VALUES ('Camarero') ON CONFLICT (nombre) DO NOTHING;

-- ============================================================
-- SEED: Auth Users + Perfiles
-- ============================================================
DO $$
DECLARE
  admin_id uuid := gen_random_uuid();
  camarero_id uuid := gen_random_uuid();
  admin_role_id uuid;
  camarero_role_id uuid;
BEGIN
  SELECT id INTO admin_role_id FROM roles WHERE nombre = 'Administrador';
  SELECT id INTO camarero_role_id FROM roles WHERE nombre = 'Camarero';

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@restaurante.com') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change,
      phone_change, phone_change_token, email_change_token_current,
      email_change_confirm_status, reauthentication_token,
      recovery_token, email_change_token_new,
      is_sso_user, is_anonymous
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      admin_id,
      'authenticated',
      'authenticated',
      'admin@restaurante.com',
      crypt('admin', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      now(),
      now(),
      '',
      '',
      '',
      '',
      '',
      0,
      '',
      '',
      '',
      false,
      false
    );

    INSERT INTO perfiles (id, rol_id, nombre, apellidos)
    VALUES (admin_id, admin_role_id, 'Admin', 'Principal');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'camarero@restaurante.com') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change,
      phone_change, phone_change_token, email_change_token_current,
      email_change_confirm_status, reauthentication_token,
      recovery_token, email_change_token_new,
      is_sso_user, is_anonymous
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      camarero_id,
      'authenticated',
      'authenticated',
      'camarero@restaurante.com',
      crypt('camarero', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      now(),
      now(),
      '',
      '',
      '',
      '',
      '',
      0,
      '',
      '',
      '',
      false,
      false
    );

    INSERT INTO perfiles (id, rol_id, nombre, apellidos)
    VALUES (camarero_id, camarero_role_id, 'Carlos', 'Pérez');
  END IF;
END $$;
