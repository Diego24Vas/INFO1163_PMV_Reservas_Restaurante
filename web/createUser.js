const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseAnonKey = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';

async function createUser() {
  const response = await fetch(`${supabaseUrl}/auth/v1/signup`, {
    method: 'POST',
    headers: {
      'apikey': supabaseAnonKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: 'admin@admin.com',
      password: 'adminadmin'
    })
  });
  
  const data = await response.json();
  if (!response.ok) {
    console.error('Error:', data);
  } else {
    console.log('User created:', data.user.email);
  }
}

createUser();