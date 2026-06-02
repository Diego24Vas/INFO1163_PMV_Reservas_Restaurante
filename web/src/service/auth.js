import { createClient } from '@supabase/supabase-js';
import { supabase, supabaseUrl, supabaseAnonKey } from "../config/supabase";

export const AuthService = {
  async login(identifier, password) {
    try {
      // Validar inputs
      if (!identifier || !password) {
        throw new Error('Email y contraseña son requeridos.');
      }

      // 1. Iniciar sesión en Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: identifier,
        password: password,
      });

      if (error) {
        throw error;
      }

      if (!data.user) {
        throw new Error('No se pudo completar la autenticación.');
      }

      // 2. Consultar el perfil y el rol asociado
      const { data: perfilData, error: perfilError } = await supabase
        .from('perfiles')
        .select(`
          *,
          roles!inner(
            nombre
          )
        `)
        .eq('id', data.user.id)
        .single();

      if (perfilError) {
        // Si falla la obtención del perfil (ej. datos corruptos), cerramos la sesión y lanzamos el error
        await supabase.auth.signOut();
        throw new Error('No se pudo obtener el rol asignado a este perfil.');
      }

      // 3. Validar estructura de datos y extraer el nombre del rol
      if (!perfilData || !perfilData.roles || !perfilData.roles.nombre) {
        await supabase.auth.signOut();
        throw new Error('Datos de perfil incompletos o inválidos.');
      }

      const roleName = perfilData.roles.nombre;

      return {
        sessionData: data,
        roleName: roleName,
        perfil: perfilData
      };
    } catch (error) {
      console.error('Error en login:', error);
      throw error;
    }
  },

  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getCurrentUser() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  },

  async createStaffMember({ email, password, nombre, apellidos, rol_id }) {
    try {
      // Validación de inputs
      if (!email || !password || !nombre || !apellidos || !rol_id) {
        throw new Error('Todos los campos son requeridos: email, password, nombre, apellidos, rol_id.');
      }

      // Validar formato de email básico
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('El email proporcionado no es válido.');
      }

      // Validar longitud mínima de contraseña
      if (password.length < 6) {
        throw new Error('La contraseña debe tener al menos 6 caracteres.');
      }

      // Validar que el rol existe
      const { data: rolData, error: rolError } = await supabase
        .from('roles')
        .select('id')
        .eq('id', rol_id)
        .single();

      if (rolError || !rolData) {
        throw new Error(`El rol con ID ${rol_id} no existe.`);
      }

      // 1. Crear un cliente secundario efímero
      // Al setear persistSession en false, evitamos que el nuevo usuario sobrescriba
      // la sesión activa del administrador en el localStorage del navegador.
      const secondarySupabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        }
      });

      // 2. Crear la cuenta en Supabase Auth usando la instancia secundaria
      const { data: authData, error: authError } = await secondarySupabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('No se pudo crear el usuario en Auth.');

      const newUserId = authData.user.id;

      try {
        // 3. Insertar el registro en 'perfiles' usando la instancia PRINCIPAL
        // Esto es crucial porque la tabla perfiles requiere que el insert se ejecute
        // con los permisos (RLS) del Administrador que tiene la sesión activa actual.
        const { data: perfilData, error: perfilError } = await supabase
          .from('perfiles')
          .insert({
            id: newUserId,
            nombre,
            apellidos,
            rol_id
          })
          .select()
          .single();

        if (perfilError) {
          throw perfilError;
        }

        // 4. Devolver los datos del nuevo perfil
        return perfilData;
      } catch (perfilError) {
        console.error('Error al insertar perfil. No se pudo completar la creación.', perfilError);
        throw new Error(
          `El usuario se creó en Auth pero el perfil falló. ` +
          `ID: ${newUserId}, Email: ${email}. ` +
          `Para eliminarlo manualmente, ve a Authentication > Users en Supabase. ` +
          `Error: ${perfilError.message}`
        );
      }
    } catch (error) {
      console.error('Error en createStaffMember:', error);
      throw error;
    }
  }
};

