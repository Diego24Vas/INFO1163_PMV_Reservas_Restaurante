import { supabase } from "../config/supabase";
import { RolesService } from "./roles";

const TABLE_NAME = "perfiles";

export const PerfilesService = {
  async getAll() {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("id, nombre, apellidos, email, rol_id, creado_en");
    if (error) throw error;
    return data;
  },

  async getById(id) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("id, nombre, apellidos, email, rol_id, creado_en")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data;
  },

  async create(perfil) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert(perfil)
      .select("id, nombre, apellidos, email, rol_id, creado_en")
      .single();
    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update(updates)
      .eq("id", id)
      .select("id, nombre, apellidos, email, rol_id, creado_en")
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq("id", id)
      .select("id")
      .single();
    if (error) throw error;
    return data;
  },

  async getRolCamareroId() {
    const role = await RolesService.getByName('Camarero');
    if (!role) {
      throw new Error('El rol "Camarero" no existe en la base de datos. Ejecuta el seed.sql para crearlo.');
    }
    return role.id;
  },

  async getWaiters() {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select(`
        id,
        nombre,
        apellidos,
        email,
        creado_en,
        roles!inner(
          nombre
        )
      `)
      .filter("roles.nombre", "eq", "Camarero");

    if (error) throw error;
    return data;
  }
};
