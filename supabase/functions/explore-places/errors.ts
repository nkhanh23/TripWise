import type { ExplorePlacesErrorCode } from './types.ts';

export class ExplorePlacesError extends Error {
  constructor(
    readonly code: ExplorePlacesErrorCode,
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ExplorePlacesError';
  }
}
