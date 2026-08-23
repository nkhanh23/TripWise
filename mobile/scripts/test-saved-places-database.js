const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envFiles = [
    path.resolve(__dirname, '../.env.local'),
    path.resolve(__dirname, '../.env'),
  ];
  for (const file of envFiles) {
    if (fs.existsSync(file)) {
      const lines = fs.readFileSync(file, 'utf-8').split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const idx = trimmed.indexOf('=');
          const key = trimmed.slice(0, idx).trim();
          const val = trimmed.slice(idx + 1).trim();
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  }
}

loadEnv();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or publishable key');
  process.exit(1);
}

async function runSmoke() {
  console.log('--- 1. Anonymous Access Test ---');
  const anonClient = createClient(supabaseUrl, supabaseKey);
  const { data: anonData, error: anonError } = await anonClient.rpc('list_saved_places', {});
  console.log('Anonymous list_saved_places result:', { hasData: Boolean(anonData), error: anonError?.message });
  if (!anonError) {
    console.error('FAIL: Anonymous call should have been rejected');
    process.exit(1);
  }
  console.log('PASS: Anonymous call rejected.');

  console.log('\n--- 2. Authenticated Operator Login ---');
  const authClient = createClient(supabaseUrl, supabaseKey);
  const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
    email: 'sarah.j@example.com',
    password: 'password123',
  });
  if (authError || !authData.user) {
    console.error('FAIL: Operator login failed', authError);
    process.exit(1);
  }
  console.log('PASS: Operator logged in as', authData.user.id);

  console.log('\n--- 3. Seed Real Stitch-Aligned Saved Places ---');
  // Real places in Bangkok matching Stitch categories:
  // 1. Wat Arun (Culture / Landmark / Attraction) -> ChIJaSv_6gaZ4jARnbiUVn6Z_YY
  // 2. The Grand Palace (Culture / Landmark / Attraction) -> ChIJPzZsMU6Z4jARQUzvk913bCo
  // 3. ICONSIAM (Shopping / Mall) -> ChIJz2vN6hGZ4jAR2h7q3L8UaIo
  // 4. Supanniga Eating Room (Dining / Restaurant) -> ChIJxR1o8-6Z4jAR-5Qz34r7N8s

  const realPlaces = [
    {
      p_google_place_id: 'ChIJaSv_6gaZ4jARnbiUVn6Z_YY',
      p_place_name: 'Wat Arun',
      p_latitude: 13.7437,
      p_longitude: 100.4888,
      p_place_address: '158 Thanon Wang Doem, Wat Arun, Bangkok Yai, Bangkok',
      p_place_category: 'temple',
    },
    {
      p_google_place_id: 'ChIJPzZsMU6Z4jARQUzvk913bCo',
      p_place_name: 'The Grand Palace',
      p_latitude: 13.7500,
      p_longitude: 100.4913,
      p_place_address: 'Na Phra Lan Rd, Phra Borom Maha Ratchawang, Phra Nakhon, Bangkok',
      p_place_category: 'landmark',
    },
    {
      p_google_place_id: 'ChIJz2vN6hGZ4jAR2h7q3L8UaIo',
      p_place_name: 'ICONSIAM',
      p_latitude: 13.7267,
      p_longitude: 100.5108,
      p_place_address: '299 Charoen Nakhon Rd, Khlong Ton Sai, Khlong San, Bangkok',
      p_place_category: 'shopping_mall',
    },
    {
      p_google_place_id: 'ChIJxR1o8-6Z4jAR-5Qz34r7N8s',
      p_place_name: 'Supanniga Eating Room',
      p_latitude: 13.7444,
      p_longitude: 100.4915,
      p_place_address: '392/25-26 Maha Rat Rd, Phra Borom Maha Ratchawang, Phra Nakhon, Bangkok',
      p_place_category: 'restaurant',
    },
  ];

  for (const place of realPlaces) {
    const { data: saveRes, error: saveErr } = await authClient.rpc('save_place', place);
    if (saveErr) {
      console.error(`FAIL to save ${place.p_place_name}:`, saveErr);
      process.exit(1);
    }
    console.log(`Saved: ${place.p_place_name} (${saveRes.id})`);
  }
  console.log('PASS: Saved all 4 real places.');

  console.log('\n--- 4. List Saved Places ---');
  const { data: listRes, error: listErr } = await authClient.rpc('list_saved_places', { p_limit: 10 });
  if (listErr) {
    console.error('FAIL to list saved places:', listErr);
    process.exit(1);
  }
  console.log('PASS: Listed saved places, total items:', listRes.items?.length);
  listRes.items?.forEach((item) => console.log(` - ${item.placeName} [${item.placeCategory}]`));

  console.log('\n--- 5. Duplicate Save (Idempotency) ---');
  const { data: dupRes, error: dupErr } = await authClient.rpc('save_place', realPlaces[0]);
  if (dupErr) {
    console.error('FAIL on duplicate save:', dupErr);
    process.exit(1);
  }
  console.log('PASS: Duplicate save returned existing/updated record without error:', dupRes.placeName);

  const { data: listAfterDup } = await authClient.rpc('list_saved_places', { p_limit: 10 });
  if (listAfterDup.items?.length !== realPlaces.length) {
    console.error(`FAIL: Expected ${realPlaces.length} items after duplicate save, got ${listAfterDup.items?.length}`);
    process.exit(1);
  }
  console.log(`PASS: No duplicate rows created (${listAfterDup.items?.length} items).`);

  console.log('\nALL DATABASE & RLS SMOKE TESTS PASSED!');
}

runSmoke().catch((err) => {
  console.error('Fatal smoke error:', err);
  process.exit(1);
});
