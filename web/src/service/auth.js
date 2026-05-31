import { supabase } from "../config/supabase";

export const AuthService = {
  async login(identifier, password) {
    // Mapeo especial para el requerimiento "admin / admin"
    // Supabase Auth requiere formato de email y password >= 6 caracteres.
    let loginEmail = identifier;
    let loginPassword = password;

    if (loginEmail === "admin" && loginPassword === "admin") {
      loginEmail = "admin@admin.com";
      loginPassword = "adminadmin";
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });

    if (error) {
      throw error;
    }

    return data;
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
};
