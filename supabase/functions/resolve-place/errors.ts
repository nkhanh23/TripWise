import type { ResolvePlaceErrorCode } from './types.ts';

export class ResolvePlaceError extends Error {
  constructor(readonly code: ResolvePlaceErrorCode, message: string, readonly status: number) {
    super(message);
    this.name = 'ResolvePlaceError';
  }
}
