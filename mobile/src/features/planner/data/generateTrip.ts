import { supabase } from '../../../lib/supabase/client';
import { parseGenerateTripResponse } from './contract';
import type { GenerateTripErrorCode, GenerateTripRequest, GeneratedTrip } from './types';

const knownErrorCodes: readonly GenerateTripErrorCode[] = [
  'INVALID_REQUEST',
  'UNAUTHORIZED',
  'AI_TIMEOUT',
  'AI_UNAVAILABLE',
  'AI_INVALID_RESPONSE',
  'INTERNAL_ERROR',
];

export class GenerateTripClientError extends Error {
  constructor(readonly code: GenerateTripErrorCode, message: string) {
    super(message);
    this.name = 'GenerateTripClientError';
  }
}

function isKnownErrorCode(value: unknown): value is GenerateTripErrorCode {
  return typeof value === 'string' && knownErrorCodes.includes(value as GenerateTripErrorCode);
}

export function mapGenerateTripErrorPayload(value: unknown): GenerateTripClientError {
  if (typeof value === 'object' && value !== null && 'error' in value) {
    const error = (value as { error?: unknown }).error;
    if (typeof error === 'object' && error !== null) {
      const { code, message } = error as { code?: unknown; message?: unknown };
      if (isKnownErrorCode(code) && typeof message === 'string') {
        return new GenerateTripClientError(code, message);
      }
    }
  }
  return new GenerateTripClientError('INTERNAL_ERROR', 'Không thể tạo lịch trình. Vui lòng thử lại.');
}

async function mapInvokeError(error: unknown): Promise<GenerateTripClientError> {
  const context = typeof error === 'object' && error !== null && 'context' in error
    ? (error as { context?: unknown }).context
    : undefined;
  if (typeof context === 'object' && context !== null && 'clone' in context
    && typeof (context as { clone?: unknown }).clone === 'function') {
    try {
      const response = (context as { clone: () => { json: () => Promise<unknown> } }).clone();
      return mapGenerateTripErrorPayload(await response.json());
    } catch {
      // Use the safe fallback below when the function did not return JSON.
    }
  }
  return mapGenerateTripErrorPayload(null);
}

export async function generateTrip(input: GenerateTripRequest): Promise<GeneratedTrip> {
  const { data, error } = await supabase.functions.invoke('generate-trip', { body: input });
  if (error) {
    throw await mapInvokeError(error);
  }
  const trip = parseGenerateTripResponse(data);
  if (!trip) {
    throw new GenerateTripClientError('AI_INVALID_RESPONSE', 'Dịch vụ AI trả về lịch trình không hợp lệ.');
  }
  return trip;
}
