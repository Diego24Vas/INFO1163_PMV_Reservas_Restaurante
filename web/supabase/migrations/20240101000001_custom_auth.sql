-- ============================================================
-- Migration: Custom authentication (remove Supabase Auth)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Add email and password_hash to perfiles
ALTER TABLE perfiles
  ADD COLUMN IF NOT EXISTS email text UNIQUE,
  ADD COLUMN IF NOT EXISTS password_hash text;

UPDATE perfiles p SET email = u.email FROM auth.users u WHERE p.id = u.id;

ALTER TABLE perfiles
  ALTER COLUMN email SET NOT NULL,
  ALTER COLUMN password_hash SET NOT NULL;

-- 2. Remove FK dependency on auth.users
ALTER TABLE perfiles DROP CONSTRAINT IF EXISTS perfiles_id_fkey;

-- 3. Make perfiles.id self-generating (no longer linked to auth.users)
ALTER TABLE perfiles ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 4. Update RLS policies from authenticated to anon
-- (since we no longer use Supabase Auth, all DB access goes through anon key)
DROP POLICY IF EXISTS "Allow all authenticated on roles" ON roles;
DROP POLICY IF EXISTS "Allow all authenticated on perfiles" ON perfiles;
DROP POLICY IF EXISTS "Allow all authenticated on zonas" ON zonas;
DROP POLICY IF EXISTS "Allow all authenticated on mesas" ON mesas;
DROP POLICY IF EXISTS "Allow all authenticated on sesiones_registro" ON sesiones_registro;
DROP POLICY IF EXISTS "Allow all authenticated on pedidos" ON pedidos;
DROP POLICY IF EXISTS "Allow all authenticated on limpiezas" ON limpiezas;
DROP POLICY IF EXISTS "Allow all authenticated on elementos_topologia" ON elementos_topologia;
DROP POLICY IF EXISTS "Allow all authenticated on system_config" ON system_config;

CREATE POLICY "Allow all anon on roles" ON roles FOR ALL TO anon USING (true);
CREATE POLICY "Allow all anon on perfiles" ON perfiles FOR ALL TO anon USING (true);
CREATE POLICY "Allow all anon on zonas" ON zonas FOR ALL TO anon USING (true);
CREATE POLICY "Allow all anon on mesas" ON mesas FOR ALL TO anon USING (true);
CREATE POLICY "Allow all anon on sesiones_registro" ON sesiones_registro FOR ALL TO anon USING (true);
CREATE POLICY "Allow all anon on pedidos" ON pedidos FOR ALL TO anon USING (true);
CREATE POLICY "Allow all anon on limpiezas" ON limpiezas FOR ALL TO anon USING (true);
CREATE POLICY "Allow all anon on elementos_topologia" ON elementos_topologia FOR ALL TO anon USING (true);
CREATE POLICY "Allow all anon on system_config" ON system_config FOR ALL TO anon USING (true);

-- 5. Create auth RPC functions (SECURITY DEFINER so anon can call them)

CREATE OR REPLACE FUNCTION verify_password(p_email text, p_password text)
RETURNS TABLE (id uuid, nombre text, apellidos text, email text, rol_id uuid, rol_nombre text)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.nombre, p.apellidos, p.email, p.rol_id, r.nombre
  FROM perfiles p
  JOIN roles r ON r.id = p.rol_id
  WHERE p.email = p_email
  AND p.password_hash = crypt(p_password, p.password_hash);
END;
$$;

CREATE OR REPLACE FUNCTION create_perfil_with_password(
  p_email text, p_password text, p_nombre text,
  p_apellidos text, p_rol_id uuid
) RETURNS TABLE (id uuid, nombre text, apellidos text, email text, rol_id uuid)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  INSERT INTO perfiles (email, password_hash, nombre, apellidos, rol_id)
  VALUES (p_email, crypt(p_password, gen_salt('bf')), p_nombre, p_apellidos, p_rol_id)
  RETURNING perfiles.id, perfiles.nombre, perfiles.apellidos, perfiles.email, perfiles.rol_id;
END;
$$;

CREATE OR REPLACE FUNCTION update_perfil_password(
  p_id uuid, p_password text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  UPDATE perfiles
  SET password_hash = crypt(p_password, gen_salt('bf'))
  WHERE id = p_id;
END;
$$;

-- 6. Update column comment
COMMENT ON COLUMN "perfiles"."id" IS 'Identificador único del perfil (autogenerado)';
COMMENT ON COLUMN "perfiles"."email" IS 'Email o identificador único para login';
COMMENT ON COLUMN "perfiles"."password_hash" IS 'Hash de contraseña (bcrypt via pgcrypto)';
