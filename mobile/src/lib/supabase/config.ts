export type SupabaseConfig = {
  url: string;
  publishableKey: string;
};

export class SupabaseConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SupabaseConfigurationError";
  }
}

export function readSupabaseConfig(
  environment: Record<string, string | undefined>,
): SupabaseConfig {
  const url = environment.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey =
    environment.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url || !publishableKey) {
    throw new SupabaseConfigurationError(
      "Supabase configuration is missing. Copy mobile/.env.example to mobile/.env and set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
      throw new Error("unsupported protocol");
    }
  } catch {
    throw new SupabaseConfigurationError(
      "EXPO_PUBLIC_SUPABASE_URL must be a valid HTTP(S) URL.",
    );
  }

  return { url, publishableKey };
}

export function getSupabaseConfig(): SupabaseConfig {
  const isTest = process.env.NODE_ENV === "test" || typeof jest !== "undefined";
  return readSupabaseConfig({
    EXPO_PUBLIC_SUPABASE_URL:
      process.env.EXPO_PUBLIC_SUPABASE_URL ||
      (isTest ? "https://mock.supabase.co" : undefined),
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      (isTest ? "mock-publishable-key" : undefined),
  });
}
