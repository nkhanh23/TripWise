const { createClient } = require('@supabase/supabase-js');
const { execSync } = require('child_process');

async function testAuth() {
  const supabaseUrl = 'https://bvblyrzbkyhcreimuumu.supabase.co';
  const supabaseKey = 'sb_publishable_7-J3EoEcSNXovk1EniZ7AA_FGMPmbVI';
  const client = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

  const userId = '11111111-1111-4111-1111-111111111111';
  const email = 'test_auth_' + Date.now() + '@example.com';
  const password = 'TestPassword123!';

  const sql = `
      DELETE FROM auth.users WHERE id = '${userId}';
      
      INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token) 
      VALUES 
      ('${userId}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '${email}', crypt('${password}', gen_salt('bf', 10)), now(), now(), '{"provider":"email","providers":["email"]}', '{"email_verified":true}', now(), now(), '', '', '', '');

      INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at) 
      VALUES 
      (gen_random_uuid(), '${userId}', format('{"sub":"%s","email":"%s"}', '${userId}', '${email}')::jsonb, 'email', '${userId}', now(), now(), now());
  `;

  require('fs').writeFileSync('d:/Dev/TripWise/temp_auth.sql', sql);
  execSync(`npx supabase db query --linked -f temp_auth.sql`, { cwd: 'd:/Dev/TripWise' });
  console.log('Setup done, trying to sign in...');

  let res = await client.auth.signInWithPassword({ email, password });
  console.log('Sign in result:', res.error ? res.error.message : 'SUCCESS', res.data?.session?.access_token ? 'GOT TOKEN' : 'NO TOKEN');

}

testAuth();
