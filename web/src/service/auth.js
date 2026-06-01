import { createClient } from '@supabase/supabase-js';
import { supabase, supabaseUrl, supabaseAnonKey } from '../config/supabase';

export const AuthService = {
  async login(identifier, password) {
    // Mapeo especial para el requerimiento "admin / admin"
    let loginEmail = identifier;
    let loginPassword = password;

    if (loginEmail === 'admin' && loginPassword === 'admin') {
      loginEmail = 'admin@admin.com';
      loginPassword = 'adminadmin';
    }

    // 1. Iniciar sesión en Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
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

    // 3. Extraer el nombre del rol y devolverlo junto con la sesión
    const roleName = perfilData.roles.nombre;

    return {
      sessionData: data,
      roleName: roleName,
      perfil: perfilData
    };
  },

  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  },

  // --- NUEVA FUNCIÓN ---

  async createStaffMember({ email, password, nombre, apellidos, rol_id }) {
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
      // Nota: Si el insert falla, el usuario ya se creó en Auth.
      // Manejar el "rollback" requeriría permisos de superusuario, por lo que 
      // si esto ocurre, quedará un usuario "fantasma" en auth sin perfil.
      throw perfilError;
    }

    // 4. Devolver los datos del nuevo perfil
    return perfilData;
  }
};
