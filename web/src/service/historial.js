import { supabase } from "../config/supabase";

const TABLE_NAME = "historial_eventos";

export const HistorialService = {
  async getAll() {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async create(evento) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert(evento)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};
