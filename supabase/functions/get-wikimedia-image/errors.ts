export type WikimediaImageErrorCode =
  | 'IMAGE_INPUT_INVALID'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'WIKIMEDIA_RATE_LIMITED'
  | 'WIKIMEDIA_UNAVAILABLE';

export class WikimediaImageError extends Error {
  constructor(
    readonly code: WikimediaImageErrorCode,
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'WikimediaImageError';
  }
}
