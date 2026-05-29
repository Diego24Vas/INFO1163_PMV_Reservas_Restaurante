import { supabase } from "../config/supabase";

const TABLE_NAME = "pedidos";

export const PedidosService = {
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

  async getBySesionId(sesionId) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("*")
      .eq("sesion_id", sesionId);
    if (error) throw error;
    return data;
  },

  async create(pedido) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert(pedido)
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
