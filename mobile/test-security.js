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

async function runSecuritySmoke() {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data: authData } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });

  const token = authData.session.access_token;
  const user = authData.user;
  
  // Create an arbitrary googlePlaceId
  const arbitraryPlaceId = 'ChIJ_arbitrary_unowned_place';
  const ownedPlaceId = 'ChIJaSv_6gaZ4jARnbiUVn6Z_YY'; // Wat Arun (Itinerary Item)
  
  console.log('--- GET-PLACE-METADATA ---');
  // 1. anonymous request -> 401
  let res = await fetch(`${supabaseUrl}/functions/v1/get-place-metadata`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ googlePlaceId: ownedPlaceId })
  });
  console.log('1. Anonymous ->', res.status);

  // 2. authenticated owner -> 200
  res = await fetch(`${supabaseUrl}/functions/v1/get-place-metadata`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ googlePlaceId: ownedPlaceId })
  });
  console.log('2. Owner ->', res.status);

  // 4/5. authenticated unowned place -> 403
  res = await fetch(`${supabaseUrl}/functions/v1/get-place-metadata`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ googlePlaceId: arbitraryPlaceId })
  });
  console.log('4/5. Arbitrary/Unowned ->', res.status);

  console.log('\n--- GET-PLACE-PHOTO ---');
  // Photo: Owner -> 200
  res = await fetch(`${supabaseUrl}/functions/v1/get-place-photo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ googlePlaceId: ownedPlaceId })
  });
  console.log('Photo Owner ->', res.status);

  // Photo: Unowned -> 403
  res = await fetch(`${supabaseUrl}/functions/v1/get-place-photo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ googlePlaceId: arbitraryPlaceId })
  });
  console.log('Photo Unowned ->', res.status);
}

runSecuritySmoke();
