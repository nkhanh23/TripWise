const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const envContent = fs.readFileSync('.env', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) envVars[match[1].trim()] = match[2].trim().replace(/^['"](.*)['"]$/, '$1');
});
const supabaseUrl = envVars.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = envVars.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || envVars.EXPO_PUBLIC_SUPABASE_ANON_KEY;
async function run() {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data: authData } = await supabase.auth.signInWithPassword({
    email: 'sarah.j@example.com', password: 'password123',
  });
  let { data: savedPlaces } = await supabase.from('saved_places').select('google_place_id').limit(1);
  let ownedPlaceId = savedPlaces?.[0]?.google_place_id;
  console.log('Saved Place:', ownedPlaceId);
  const { data: items } = await supabase.from('itinerary_items').select('google_place_id').not('google_place_id', 'is', null).limit(1);
  console.log('Itinerary Item:', items?.[0]?.google_place_id);
}
run();
