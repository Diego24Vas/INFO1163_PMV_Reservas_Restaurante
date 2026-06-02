-- ============================================================
-- DB FINAL: Fusión de db_referencia.sql + setup_topology_referencia.sql
-- ============================================================

-- MERGE: Tablas de db_referencia.sql (esquema principal)

CREATE TABLE "roles" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "nombre" text UNIQUE NOT NULL
);

CREATE TABLE "perfiles" (
  "id" uuid PRIMARY KEY,
  "rol_id" uuid NOT NULL,
  "nombre" text NOT NULL,
  "apellidos" text NOT NULL,
  "creado_en" timestamptz DEFAULT (now())
);

CREATE TABLE "zonas" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "nombre" text UNIQUE NOT NULL,
  "color_referencia" text,
  "orden_visual" integer,
  "activa" boolean DEFAULT true
);

CREATE TABLE "mesas" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "zona_id" uuid NOT NULL,
  "numero_mesa" integer UNIQUE NOT NULL,
  "capacidad_nominal" integer NOT NULL,
  "estado" text NOT NULL DEFAULT 'Disponible',
  "posicion_x" numeric NOT NULL DEFAULT 0,
  "posicion_y" numeric NOT NULL DEFAULT 0,
  "forma" text DEFAULT 'cuadrada',
  "rotacion" integer DEFAULT 0,
  "bloqueada_hasta" timestamptz,
  "bloqueada_por" uuid,
  "mesa_padre_id" uuid,
  "ultimo_cambio_estado" timestamptz,
  "asignado_a" uuid,
  "comensales" integer,
  "grupo_fusion" text
);

CREATE TABLE "sesiones_registro" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "mesa_id" uuid NOT NULL,
  "camarero_id" uuid NOT NULL,
  "estado" text NOT NULL DEFAULT 'Activa',
  "comensales_reales" integer NOT NULL,
  "capacidad_override" boolean DEFAULT false,
  "inicio_ocupacion" timestamptz DEFAULT (now()),
  "ultima_actividad" timestamptz DEFAULT (now()),
  "fin_ocupacion" timestamptz
);

CREATE TABLE "pedidos" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "sesion_id" uuid NOT NULL,
  "descripcion_actividad" text,
  "creado_en" timestamptz DEFAULT (now())
);

CREATE TABLE "limpiezas" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "mesa_id" uuid NOT NULL,
  "personal_mantenimiento_id" uuid,
  "estado" text NOT NULL DEFAULT 'Pendiente',
  "creado_en" timestamptz DEFAULT (now()),
  "completado_en" timestamptz
);

-- MERGE: Tablas adicionales de setup_topology_referencia.sql

CREATE TABLE "elementos_topologia" (
  id uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  zona_id uuid REFERENCES zonas(id) ON DELETE CASCADE,
  type text NOT NULL,
  x numeric NOT NULL,
  y numeric NOT NULL,
  width numeric NOT NULL,
  height numeric NOT NULL,
  rotation numeric NOT NULL DEFAULT 0
);

CREATE TABLE "system_config" (
  key text PRIMARY KEY,
  value jsonb NOT NULL
);

-- MERGE: RLS en todas las tablas (solo usuarios autenticados)

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE zonas ENABLE ROW LEVEL SECURITY;
ALTER TABLE mesas ENABLE ROW LEVEL SECURITY;
ALTER TABLE sesiones_registro ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE limpiezas ENABLE ROW LEVEL SECURITY;
ALTER TABLE elementos_topologia ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all authenticated on roles" ON roles FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all authenticated on perfiles" ON perfiles FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all authenticated on zonas" ON zonas FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all authenticated on mesas" ON mesas FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all authenticated on sesiones_registro" ON sesiones_registro FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all authenticated on pedidos" ON pedidos FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all authenticated on limpiezas" ON limpiezas FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all authenticated on elementos_topologia" ON elementos_topologia FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all authenticated on system_config" ON system_config FOR ALL TO authenticated USING (true);

-- MERGE: Comentarios de db_referencia.sql

COMMENT ON COLUMN "roles"."nombre" IS 'Ej: ''Administrador'', ''Hostess'', ''Camarero'', ''Mantenimiento''';
COMMENT ON COLUMN "perfiles"."id" IS 'Extiende auth.users de Supabase';
COMMENT ON COLUMN "zonas"."nombre" IS 'Ej: ''Salón Principal'', ''Terraza'', ''Barra''';
COMMENT ON COLUMN "zonas"."color_referencia" IS 'Código HEX para identificar la zona';
COMMENT ON COLUMN "zonas"."orden_visual" IS 'Para ordenar las vistas en el frontend';
COMMENT ON COLUMN "mesas"."capacidad_nominal" IS 'RN04: Capacidad máxima física (Debe ser > 0)';
COMMENT ON COLUMN "mesas"."estado" IS 'Disponible, En Asignacion, Ocupada, Requiere Limpieza, Inactividad Ambar';
COMMENT ON COLUMN "mesas"."posicion_x" IS 'Coordenada X en el plano';
COMMENT ON COLUMN "mesas"."posicion_y" IS 'Coordenada Y en el plano';
COMMENT ON COLUMN "mesas"."forma" IS '''cuadrada'', ''redonda'', ''rectangular''';
COMMENT ON COLUMN "mesas"."rotacion" IS 'Grados de rotación visual (0-360)';
COMMENT ON COLUMN "mesas"."bloqueada_hasta" IS 'Límite para la confirmación de selección';
COMMENT ON COLUMN "mesas"."bloqueada_por" IS 'Usuario que retiene el lock';
COMMENT ON COLUMN "mesas"."mesa_padre_id" IS 'Mesa principal en caso de unión física';
COMMENT ON COLUMN "sesiones_registro"."camarero_id" IS 'RN06: Propiedad de Atención';
COMMENT ON COLUMN "sesiones_registro"."estado" IS 'Activa, Finalizada, Cancelada';
COMMENT ON COLUMN "sesiones_registro"."comensales_reales" IS 'Validación en DB: > 0';
COMMENT ON COLUMN "sesiones_registro"."capacidad_override" IS 'RN04: Permiso manual para exceder capacidad';
COMMENT ON COLUMN "sesiones_registro"."ultima_actividad" IS 'Actualizado vía DB Trigger por insert en Pedidos';
COMMENT ON COLUMN "pedidos"."descripcion_actividad" IS 'El Trigger actualiza ultima_actividad en sesiones_registro';
COMMENT ON COLUMN "limpiezas"."personal_mantenimiento_id" IS 'Quién realiza la limpieza';
COMMENT ON COLUMN "limpiezas"."estado" IS 'Pendiente, En Progreso, Finalizada';
COMMENT ON COLUMN "limpiezas"."completado_en" IS 'Libera la mesa al estado Disponible';
COMMENT ON COLUMN "mesas"."ultimo_cambio_estado" IS 'Timestamp del último cambio de estado (sincronización frontend)';
COMMENT ON COLUMN "mesas"."asignado_a" IS 'Camarero actualmente asignado a la mesa';
COMMENT ON COLUMN "mesas"."comensales" IS 'Número actual de comensales en la mesa';
COMMENT ON COLUMN "mesas"."grupo_fusion" IS 'Identificador del grupo de fusión de mesas';

-- MERGE: Foreign keys de db_referencia.sql

ALTER TABLE "perfiles" ADD FOREIGN KEY ("id") REFERENCES "auth"."users" ("id") DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE "perfiles" ADD FOREIGN KEY ("rol_id") REFERENCES "roles" ("id") DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE "mesas" ADD FOREIGN KEY ("zona_id") REFERENCES "zonas" ("id") DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE "mesas" ADD FOREIGN KEY ("bloqueada_por") REFERENCES "perfiles" ("id") DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE "mesas" ADD FOREIGN KEY ("mesa_padre_id") REFERENCES "mesas" ("id") DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE "sesiones_registro" ADD FOREIGN KEY ("mesa_id") REFERENCES "mesas" ("id") DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE "sesiones_registro" ADD FOREIGN KEY ("camarero_id") REFERENCES "perfiles" ("id") DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE "pedidos" ADD FOREIGN KEY ("sesion_id") REFERENCES "sesiones_registro" ("id") DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE "limpiezas" ADD FOREIGN KEY ("mesa_id") REFERENCES "mesas" ("id") DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE "limpiezas" ADD FOREIGN KEY ("personal_mantenimiento_id") REFERENCES "perfiles" ("id") DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE "mesas" ADD FOREIGN KEY ("asignado_a") REFERENCES "perfiles" ("id") DEFERRABLE INITIALLY IMMEDIATE;
