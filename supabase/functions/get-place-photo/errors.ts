export type PlacePhotoErrorCode =
  | 'PHOTO_INPUT_INVALID'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'PHOTO_NOT_FOUND'
  | 'PHOTO_PROVIDER_AUTH'
  | 'PHOTO_PROVIDER_RATE_LIMITED'
  | 'PHOTO_PROVIDER_UNAVAILABLE';

export class PlacePhotoError extends Error {
  readonly code: PlacePhotoErrorCode;
  readonly status: number;

  constructor(code: PlacePhotoErrorCode, message: string, status: number) {
    super(message);
    this.name = 'PlacePhotoError';
    this.code = code;
    this.status = status;
  }
}
