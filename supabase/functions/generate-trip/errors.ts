import type { GenerateTripErrorCode } from './types.ts';

export class GenerateTripError extends Error {
  constructor(
    readonly code: GenerateTripErrorCode,
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'GenerateTripError';
  }
}
