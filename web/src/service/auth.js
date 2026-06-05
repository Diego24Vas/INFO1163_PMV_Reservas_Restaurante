import { supabase } from "../config/supabase";

const SESSION_KEY = "pmv_session";

export const AuthService = {
  async login(email, password) {
    if (!email || !password) {
      throw new Error("Email y contraseña son requeridos.");
    }

    const { data, error } = await supabase.rpc("verify_password", {
      p_email: email,
      p_password: password,
    });

    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error("Credenciales inválidas.");
    }

    const userData = data[0];
    const session = {
      user: {
        id: userData.id,
        email: userData.email,
      },
      perfil: {
        id: userData.id,
        nombre: userData.nombre,
        apellidos: userData.apellidos,
        email: userData.email,
        rol_id: userData.rol_id,
      },
      roleName: userData.rol_nombre,
    };

    localStorage.setItem(SESSION_KEY, JSON.stringify(session));

    return {
      sessionData: { user: session.user },
      roleName: session.roleName,
      perfil: session.perfil,
    };
  },

  async logout() {
    localStorage.removeItem(SESSION_KEY);
  },

  getCurrentUser() {
    try {
      const session = JSON.parse(localStorage.getItem(SESSION_KEY));
      return session?.user || null;
    } catch {
      return null;
    }
  },

  getStoredSession() {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY));
    } catch {
      return null;
    }
  },

  async createStaffMember({ email, password, nombre, apellidos, rol_id }) {
    if (!email || !password || !nombre || !apellidos || !rol_id) {
      throw new Error(
        "Todos los campos son requeridos: email, password, nombre, apellidos, rol_id.",
      );
    }

    const { data, error } = await supabase.rpc("create_perfil_with_password", {
      p_email: email,
      p_password: password,
      p_nombre: nombre,
      p_apellidos: apellidos,
      p_rol_id: rol_id,
    });

    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error("No se pudo crear el usuario.");
    }

    return data[0];
  },
};
