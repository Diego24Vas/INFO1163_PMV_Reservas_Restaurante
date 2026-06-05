import { supabase } from "../config/supabase";

const TABLE_NAME = "limpiezas";

export const LimpiezasService = {
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

  async getPendienteByMesaId(mesaId) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("*")
      .eq("mesa_id", mesaId)
      .in("estado", ["Pendiente", "En Progreso"])
      .order("creado_en", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async create(limpieza) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert(limpieza)
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
