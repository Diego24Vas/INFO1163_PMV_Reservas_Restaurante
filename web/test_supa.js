import { createClient } from '@supabase/supabase-js';
const supabase = createClient('http://127.0.0.1:54321', 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH');
async function run() {
  const { data: zonas, error: err1 } = await supabase.from('zonas').select('*');
  const { data: mesas, error: err2 } = await supabase.from('mesas').select('*');
  const { data: elementos, error: err3 } = await supabase.from('elementos_topologia').select('*');
  console.log('zonas:', zonas, err1);
  console.log('mesas:', mesas, err2);
  console.log('elementos:', elementos, err3);
}
run();
