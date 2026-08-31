import { buildGeneratedTripJsonSchema, validateGeneratedTrip } from './contract.ts';
import { GenerateTripError } from './errors.ts';
import { buildTripPrompt, tripPlannerSystemInstruction } from './prompt.ts';
import type { GenerateTripRequest, GeneratedTrip } from './types.ts';

const geminiEndpoint = 'https://generativelanguage.googleapis.com/v1beta/interactions';
const defaultModel = 'gemini-3.5-flash-lite';
export const defaultGeminiTimeoutMilliseconds = 40_000;

type GeminiInteractionResponse = {
  output_text?: unknown;
  steps?: unknown;
};

type ProviderFailureCategory = 'auth' | 'rate_limit' | 'provider_5xx' | 'provider_4xx' | 'provider_other';

function classifyProviderStatus(status: number): ProviderFailureCategory {
  if (status === 401 || status === 403) return 'auth';
  if (status === 429) return 'rate_limit';
  if (status >= 500) return 'provider_5xx';
  if (status >= 400) return 'provider_4xx';
  return 'provider_other';
}

export function readInteractionOutputText(interaction: GeminiInteractionResponse): string | null {
  if (typeof interaction.output_text === 'string') {
    return interaction.output_text;
  }
  if (!Array.isArray(interaction.steps)) {
    return null;
  }

  for (let index = interaction.steps.length - 1; index >= 0; index -= 1) {
    const step = interaction.steps[index];
    if (typeof step !== 'object' || step === null || !('type' in step) || step.type !== 'model_output'
      || !('content' in step) || !Array.isArray(step.content)) {
      continue;
    }
    const content: unknown[] = step.content;
    const text = content
      .filter((block: unknown): block is { type: 'text'; text: string } =>
        typeof block === 'object' && block !== null && 'type' in block && block.type === 'text'
        && 'text' in block && typeof block.text === 'string')
      .map((block) => block.text)
      .join('');
    if (text.length > 0) {
      return text;
    }
  }
  return null;
}

export function parseGeneratedTripJson(outputText: string): unknown {
  const trimmedOutput = outputText.trim();
  const fencedJson = /^```(?:json)?[\t ]*\r?\n([\s\S]*?)\r?\n```$/i.exec(trimmedOutput);
  return JSON.parse(fencedJson?.[1].trim() ?? trimmedOutput);
}

export function buildGeminiHeaders(apiKey: string): Record<string, string> {
  return { 'content-type': 'application/json', 'x-goog-api-key': apiKey };
}

export function resolveGeminiTimeoutMilliseconds(configuredValue: string | undefined): number {
  const configured = Number(configuredValue);
  return Number.isFinite(configured) && configured >= 5_000 && configured <= 45_000
    ? configured
    : defaultGeminiTimeoutMilliseconds;
}

export async function generateTripWithGemini(request: GenerateTripRequest): Promise<GeneratedTrip> {
  const apiKey = Deno.env.get('GEMINI_API_KEY')?.trim();
  if (!apiKey) {
    throw new GenerateTripError('AI_UNAVAILABLE', 'AI service is not configured.', 503);
  }

  const model = Deno.env.get('GEMINI_MODEL')?.trim() || defaultModel;
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    resolveGeminiTimeoutMilliseconds(Deno.env.get('GEMINI_TIMEOUT_MS')),
  );

  try {
    const response = await fetch(geminiEndpoint, {
      method: 'POST',
      headers: buildGeminiHeaders(apiKey),
      signal: controller.signal,
      body: JSON.stringify({
        model,
        store: false,
        system_instruction: tripPlannerSystemInstruction,
        input: buildTripPrompt(request),
        response_format: { type: 'text', mime_type: 'application/json', schema: buildGeneratedTripJsonSchema(request) },
      }),
    });

    if (!response.ok) {
      console.warn('[generate-trip] Gemini provider request failed', {
        status: response.status,
        category: classifyProviderStatus(response.status),
      });
      throw new GenerateTripError('AI_UNAVAILABLE', 'AI service is temporarily unavailable.', 503);
    }

    const interaction = await response.json() as GeminiInteractionResponse;
    const outputText = readInteractionOutputText(interaction);
    if (!outputText) {
      throw new GenerateTripError('AI_INVALID_RESPONSE', 'AI response did not contain structured text.', 502);
    }

    let parsed: unknown;
    try {
      parsed = parseGeneratedTripJson(outputText);
    } catch {
      throw new GenerateTripError('AI_INVALID_RESPONSE', 'AI response was not valid JSON.', 502);
    }

    const validated = validateGeneratedTrip(parsed, request);
    if (!validated.ok) {
      console.warn('[generate-trip] Gemini itinerary contract rejected', {
        category: 'invalid_itinerary_contract',
        diagnostic: validated.diagnostic ?? 'trip_metadata_or_shape',
      });
      throw new GenerateTripError('AI_INVALID_RESPONSE', validated.message, 502);
    }
    return validated.value;
  } catch (error) {
    if (error instanceof GenerateTripError) {
      throw error;
    }
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new GenerateTripError('AI_TIMEOUT', 'AI generation timed out.', 504);
    }
    console.warn('[generate-trip] Gemini provider transport failed', { category: 'network' });
    throw new GenerateTripError('AI_UNAVAILABLE', 'AI service is temporarily unavailable.', 503);
  } finally {
    clearTimeout(timeout);
  }
}
