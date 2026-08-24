import { IntegrationError, mapPlacePhotoError } from '../src/integration/errors';
import { SupabasePlacePhotoRepository } from '../src/integration/remote/supabasePlacePhotoRepository';
import {
  ContractValidationError,
  parseGetPlacePhotoSuccess,
  validateGetPlacePhotoRequest,
} from '../src/integration/validation';

describe('Place Photos Integration & Validation', () => {
  beforeEach(() => {
    SupabasePlacePhotoRepository.clearCache();
  });

  describe('validateGetPlacePhotoRequest', () => {
    it('validates correct request with default maxWidth', () => {
      const result = validateGetPlacePhotoRequest({
        googlePlaceId: 'ChIJaSv_6gaZ4jARnbiUVn6Z_YY',
      });
      expect(result.googlePlaceId).toBe('ChIJaSv_6gaZ4jARnbiUVn6Z_YY');
      expect(result.maxWidth).toBeUndefined();
    });

    it('validates request with custom maxWidth', () => {
      const result = validateGetPlacePhotoRequest({
        googlePlaceId: 'ChIJaSv_6gaZ4jARnbiUVn6Z_YY',
        maxWidth: 800,
      });
      expect(result.googlePlaceId).toBe('ChIJaSv_6gaZ4jARnbiUVn6Z_YY');
      expect(result.maxWidth).toBe(800);
    });

    it('throws ContractValidationError for invalid place ID or invalid maxWidth', () => {
      expect(() => validateGetPlacePhotoRequest({ googlePlaceId: 'short' })).toThrow(
        ContractValidationError
      );
      expect(() =>
        validateGetPlacePhotoRequest({
          googlePlaceId: 'ChIJaSv_6gaZ4jARnbiUVn6Z_YY',
          maxWidth: 10,
        })
      ).toThrow(ContractValidationError);
    });
  });

  describe('parseGetPlacePhotoSuccess', () => {
    it('parses valid photo response with attribution', () => {
      const raw = {
        data: {
          googlePlaceId: 'ChIJaSv_6gaZ4jARnbiUVn6Z_YY',
          photoUri: 'https://lh3.googleusercontent.com/places/test.jpg',
          diagnostic: {
            providerStatus: 200,
            hasPhotosProperty: true,
            photosIsArray: true,
            photosCount: 1,
            firstPhotoHasName: true,
          },
          authorAttribution: {
            displayName: 'Alice',
            uri: 'https://maps.google.com/contrib/alice',
          },
        },
      };

      const parsed = parseGetPlacePhotoSuccess(raw);
      expect(parsed.data.googlePlaceId).toBe('ChIJaSv_6gaZ4jARnbiUVn6Z_YY');
      expect(parsed.data.photoUri).toBe('https://lh3.googleusercontent.com/places/test.jpg');
      expect(parsed.data.authorAttribution?.displayName).toBe('Alice');
      expect(parsed.data.diagnostic?.photosCount).toBe(1);
    });

    it('parses null photoUri when place has no photo', () => {
      const raw = {
        data: {
          googlePlaceId: 'ChIJaSv_6gaZ4jARnbiUVn6Z_YY',
          photoUri: null,
        },
      };

      const parsed = parseGetPlacePhotoSuccess(raw);
      expect(parsed.data.photoUri).toBeNull();
    });

    it('throws on invalid envelope', () => {
      expect(() => parseGetPlacePhotoSuccess({ data: {} })).toThrow(ContractValidationError);
    });
  });

  describe('mapPlacePhotoError', () => {
    it('maps error codes cleanly without leaking secrets', () => {
      expect(mapPlacePhotoError({ error: { code: 'FORBIDDEN' } }).code).toBe('forbidden');
      expect(mapPlacePhotoError({ error: { code: 'PHOTO_NOT_FOUND' } }).code).toBe('notFound');
      expect(mapPlacePhotoError({ error: { code: 'PHOTO_PROVIDER_RATE_LIMITED' } }).code).toBe(
        'rateLimited'
      );
      expect(mapPlacePhotoError({ error: { code: 'PHOTO_PROVIDER_AUTH' } }).code).toBe(
        'providerUnavailable'
      );
      expect(mapPlacePhotoError(new TypeError('Failed to fetch')).code).toBe('network');
    });
  });

  describe('SupabasePlacePhotoRepository', () => {
    it('fetches photo from edge function and caches it for subsequent calls', async () => {
      const invokeMock = jest.fn().mockResolvedValue({
        data: {
          data: {
            googlePlaceId: 'ChIJaSv_6gaZ4jARnbiUVn6Z_YY',
            photoUri: 'https://lh3.googleusercontent.com/places/wat_arun.jpg',
          },
        },
        error: null,
      });

      const mockClient: any = {
        functions: { invoke: invokeMock },
      };

      const repo = new SupabasePlacePhotoRepository(mockClient);

      // Call 1: invokes edge function
      const photo1 = await repo.getPhoto({ googlePlaceId: 'ChIJaSv_6gaZ4jARnbiUVn6Z_YY', maxWidth: 1200 });
      expect(photo1.photoUri).toBe('https://lh3.googleusercontent.com/places/wat_arun.jpg');
      expect(invokeMock).toHaveBeenCalledTimes(1);

      // Call 2: hits in-memory cache without calling edge function again
      const photo2 = await repo.getPhoto({ googlePlaceId: 'ChIJaSv_6gaZ4jARnbiUVn6Z_YY', maxWidth: 1200 });
      expect(photo2.photoUri).toBe('https://lh3.googleusercontent.com/places/wat_arun.jpg');
      expect(invokeMock).toHaveBeenCalledTimes(1);
    });

    it('maps and throws IntegrationError on function failure', async () => {
      const invokeMock = jest.fn().mockResolvedValue({
        data: null,
        error: {
          context: {
            clone: () => ({
              json: async () => ({ error: { code: 'FORBIDDEN' } }),
            }),
          },
        },
      });

      const mockClient: any = {
        functions: { invoke: invokeMock },
      };

      const repo = new SupabasePlacePhotoRepository(mockClient);
      await expect(
        repo.getPhoto({ googlePlaceId: 'ChIJaSv_6gaZ4jARnbiUVn6Z_YY' })
      ).rejects.toThrow(IntegrationError);
    });
  });
});
