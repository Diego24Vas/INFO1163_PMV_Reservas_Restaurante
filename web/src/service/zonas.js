import { supabase } from "../config/supabase";

const TABLE_NAME = "zonas";

export const ZonasService = {
  async getAll() {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("*")
      .order("orden_visual", { ascending: true });
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

  async create(zona) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert(zona)
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
