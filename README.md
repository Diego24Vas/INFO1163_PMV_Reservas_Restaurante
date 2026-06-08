# INFO1163_PMV_Reservas_Restaurante

Sistema de gestión de mesas y reservas para restaurantes.

## Requisitos

- **Node.js** >= 18
- **Supabase CLI** ([instalación](https://supabase.com/docs/guides/local-development/cli/getting-started))
- **Docker** (requerido por Supabase CLI para entorno local)

## Configuración e inicio

### 1. Iniciar Supabase (base de datos local)

```bash
cd web
npx supabase start
```

Esto levanta PostgreSQL, la API REST (puerto 54321), Studio (puerto 54323) y los servicios auxiliares. La primera vez descargará las imágenes de Docker.

### 2. Instalar dependencias

```bash
cd web
npm install
```

### 3. Iniciar el frontend

```bash
cd web
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`.

## Credenciales de acceso

| Email | Contraseña |
|-------|-----------|
| admin@admin.com | admin |
