import { supabase } from "../config/supabase";

const TABLE_NAME = "perfiles";

export const PerfilesService = {
  async getAll() {
    const { data, error } = await supabase.from(TABLE_NAME).select("*");
    if (error) throw error;
    return data;
  },

  async getById(id) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data;
  },

  async create(perfil) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert(perfil)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // --- NUEVAS FUNCIONES ---

  /**
   * Consulta la tabla de roles y devuelve el ID del rol 'Camarero'
   */
  async getRolCamareroId() {
    const { data, error } = await supabase
      .from("roles")
      .select("id")
      .eq("nombre", "Camarero")
      .single();

    if (error) throw error;
    return data.id;
  },

  /**
   * Obtiene todos los perfiles cruzando datos con la tabla roles 
   * para traer únicamente los que tienen el rol 'Camarero'
   */
  async getWaiters() {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select(`
        *,
        roles!inner(
          nombre
        )
      `)
      .eq("roles.nombre", "Camarero");

    if (error) throw error;
    return data;
  }
};
