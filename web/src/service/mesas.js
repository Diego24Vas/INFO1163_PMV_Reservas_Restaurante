import { supabase } from "../config/supabase";

const TABLE_NAME = "mesas";

export const MesasService = {
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

  async getByZonaId(zonaId) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("*")
      .eq("zona_id", zonaId);
    if (error) throw error;
    return data;
  },

  async create(mesa) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert(mesa)
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
