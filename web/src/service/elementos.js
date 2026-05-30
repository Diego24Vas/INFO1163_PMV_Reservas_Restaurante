import { supabase } from "../config/supabase";

const TABLE_NAME = "elementos_topologia";

export const ElementosService = {
  async getAll() {
    const { data, error } = await supabase.from(TABLE_NAME).select("*");
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

  async create(elemento) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert(elemento)
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