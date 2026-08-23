const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envContent = fs.readFileSync('.env', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim().replace(/^['"](.*)['"]$/, '$1');
  }
});

const supabaseUrl = envVars.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = envVars.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || envVars.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const testEmail = 'sarah.j@example.com';
const testPassword = 'password123';

async function runSmoke() {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data: authData } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });

  let { data: items } = await supabase.from('itinerary_items').select('google_place_id, place_name').not('google_place_id', 'is', null).limit(1);
  let testPlaceId = items?.[0]?.google_place_id;

  console.log('Testing', testPlaceId);
  const response = await fetch(`${supabaseUrl}/functions/v1/get-place-metadata`, {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${authData.session.access_token}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({ googlePlaceId: testPlaceId })
  });

  const txt = await response.text();
  console.log('Status:', response.status);
  console.log('Body:', txt);
}

runSmoke();
