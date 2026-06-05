import { supabase } from "../config/supabase";

const TABLE_NAME = "roles";

export const RolesService = {
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

  async getByName(name) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("id")
      .eq("nombre", name)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async create(rol) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert(rol)
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
};
