import { readSupabaseConfig, SupabaseConfigurationError } from '../src/lib/supabase/config';

describe('readSupabaseConfig', () => {
  it('accepts the public Supabase URL and publishable key', () => {
    expect(
      readSupabaseConfig({
        EXPO_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
        EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_example',
      }),
    ).toEqual({ url: 'https://example.supabase.co', publishableKey: 'sb_publishable_example' });
  });

  it('fails clearly when required configuration is missing', () => {
    expect(() => readSupabaseConfig({ EXPO_PUBLIC_SUPABASE_URL: 'https://example.supabase.co' })).toThrow(
      SupabaseConfigurationError,
    );
  });

  it('rejects a malformed Supabase URL', () => {
    expect(() => readSupabaseConfig({ EXPO_PUBLIC_SUPABASE_URL: 'not-a-url', EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'key' })).toThrow(
      'EXPO_PUBLIC_SUPABASE_URL must be a valid HTTP(S) URL.',
    );
  });

  it('does not require or expose server-only secret variables', () => {
    const config = readSupabaseConfig({
      EXPO_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_example',
      SUPABASE_SERVICE_ROLE_KEY: 'must-not-be-read',
      GEMINI_API_KEY: 'must-not-be-read',
      GOOGLE_PLACES_API_KEY: 'must-not-be-read',
    });
    expect(config).toEqual({ url: 'https://example.supabase.co', publishableKey: 'sb_publishable_example' });
    expect(JSON.stringify(config)).not.toContain('must-not-be-read');
  });
});
