import { supabase } from "../config/supabase";

const TABLE_NAME = "system_config";

export const SystemConfigService = {
  async getAll() {
    const { data, error } = await supabase.from(TABLE_NAME).select("*");
    if (error) throw error;
    return data;
  },

  async getByKey(key) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("*")
      .eq("key", key)
      .single();
    if (error) throw error;
    return data;
  },

  async upsert(key, value) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .upsert({ key, value })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(key) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq("key", key)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};
