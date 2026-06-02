import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const supabase = createClient('http://127.0.0.1:54321', 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH');
async function run() {
  const { data: { session }, error: errAuth } = await supabase.auth.signInWithPassword({
    email: 'admin@restaurant.com',
    password: 'password123'
  });
  console.log('auth:', session ? 'ok' : 'fail', errAuth);

  const { data: zonas, error: err1 } = await supabase.from('zonas').select('*');
  const { data: mesas, error: err2 } = await supabase.from('mesas').select('*');
  const { data: elementos, error: err3 } = await supabase.from('elementos_topologia').select('*');
  console.log('zonas:', zonas?.length, zonas);
  console.log('mesas:', mesas?.length, mesas);
  console.log('elementos:', elementos?.length, elementos);
}
run();
