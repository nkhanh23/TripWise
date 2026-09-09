export type PlaceMetadataErrorCode =
  | 'INVALID_REQUEST'
  | 'PLACE_INPUT_INVALID'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'PLACE_NOT_FOUND'
  | 'PLACE_PROVIDER_AUTH'
  | 'PLACE_PROVIDER_RATE_LIMITED'
  | 'PLACE_PROVIDER_UNAVAILABLE'
  | 'PLACE_PROVIDER_INVALID_RESPONSE'
  | 'INTERNAL_ERROR';

export class PlaceMetadataError extends Error {
  constructor(
    public readonly code: PlaceMetadataErrorCode | string,
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = 'PlaceMetadataError';
  }
}
