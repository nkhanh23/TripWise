
      DELETE FROM auth.users WHERE id = '11111111-1111-4111-1111-111111111111';
      
      INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) 
      VALUES 
      ('11111111-1111-4111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'test_auth_1789275870292@example.com', crypt('TestPassword123!', gen_salt('bf')), now(), '{}', '{}', now(), now());

      INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at) 
      VALUES 
      ('11111111-1111-4111-1111-111111111111', '11111111-1111-4111-1111-111111111111', format('{"sub":"%s","email":"%s"}', '11111111-1111-4111-1111-111111111111', 'test_auth_1789275870292@example.com')::jsonb, 'email', '11111111-1111-4111-1111-111111111111', now(), now(), now());
  