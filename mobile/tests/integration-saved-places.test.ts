import { mapCategoryToStitch, mapSavedPlaceToUIItem } from '../src/features/saved/integrationMappers';
import { mapSavedPlace } from '../src/integration/mappers';
import { SupabaseSavedPlacesRepository } from '../src/integration/remote/supabaseSavedPlacesRepository';
import {
  ContractValidationError,
  parseSavedPlaceTransport,
  parseSavedPlacesPage,
  validateSavePlaceCommand,
} from '../src/integration/validation';

describe('Saved Places Integration Contracts & Validation', () => {
  describe('validateSavePlaceCommand', () => {
    it('validates a correct save_place command', () => {
      const command = validateSavePlaceCommand({
        googlePlaceId: 'ChIJaSv_6gaZ4jARnbiUVn6Z_YY',
        name: 'Chùa Arun',
        latitude: 13.7437,
        longitude: 100.4888,
        address: 'Bangkok, Thailand',
        category: 'temple',
      });

      expect(command.googlePlaceId).toBe('ChIJaSv_6gaZ4jARnbiUVn6Z_YY');
      expect(command.name).toBe('Chùa Arun');
      expect(command.latitude).toBe(13.7437);
      expect(command.longitude).toBe(100.4888);
      expect(command.address).toBe('Bangkok, Thailand');
      expect(command.category).toBe('temple');
    });

    it('rejects invalid coordinates or place IDs', () => {
      expect(() =>
        validateSavePlaceCommand({
          googlePlaceId: 'short',
          name: 'Wat Arun',
          latitude: 13.7437,
          longitude: 100.4888,
        })
      ).toThrow(ContractValidationError);

      expect(() =>
        validateSavePlaceCommand({
          googlePlaceId: 'ChIJaSv_6gaZ4jARnbiUVn6Z_YY',
          name: '',
          latitude: 13.7437,
          longitude: 100.4888,
        })
      ).toThrow(ContractValidationError);

      expect(() =>
        validateSavePlaceCommand({
          googlePlaceId: 'ChIJaSv_6gaZ4jARnbiUVn6Z_YY',
          name: 'Wat Arun',
          latitude: 100,
          longitude: 100,
        })
      ).toThrow(ContractValidationError);
    });
  });

  describe('parseSavedPlaceTransport & parseSavedPlacesPage', () => {
    it('parses valid row transport', () => {
      const row = parseSavedPlaceTransport({
        id: '123e4567-e89b-12d3-a456-426614174000',
        googlePlaceId: 'ChIJaSv_6gaZ4jARnbiUVn6Z_YY',
        placeName: 'Chùa Arun',
        latitude: 13.7437,
        longitude: 100.4888,
        placeAddress: 'Bangkok, Thailand',
        placeCategory: 'landmark',
        createdAt: '2026-08-22T12:00:00.000Z',
      });

      expect(row.id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(row.googlePlaceId).toBe('ChIJaSv_6gaZ4jARnbiUVn6Z_YY');
      expect(row.placeName).toBe('Chùa Arun');
    });

    it('parses valid paginated response with cursor', () => {
      const page = parseSavedPlacesPage({
        items: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            googlePlaceId: 'ChIJaSv_6gaZ4jARnbiUVn6Z_YY',
            placeName: 'Chùa Arun',
            latitude: 13.7437,
            longitude: 100.4888,
            placeAddress: 'Bangkok',
            placeCategory: 'landmark',
            createdAt: '2026-08-22T12:00:00.000Z',
          },
        ],
        nextCursor: {
          createdAt: '2026-08-22T12:00:00.000Z',
          id: '123e4567-e89b-12d3-a456-426614174000',
        },
      });

      expect(page.items).toHaveLength(1);
      expect(page.nextCursor?.id).toBe('123e4567-e89b-12d3-a456-426614174000');
    });
  });

  describe('mapCategoryToStitch', () => {
    it('maps categories into approved Stitch buckets', () => {
      expect(mapCategoryToStitch('cafe').category).toBe('coffee');
      expect(mapCategoryToStitch('bakery & coffee').category).toBe('coffee');
      expect(mapCategoryToStitch('restaurant').category).toBe('restaurants');
      expect(mapCategoryToStitch('seafood dining').category).toBe('restaurants');
      expect(mapCategoryToStitch('shopping_mall').category).toBe('shopping');
      expect(mapCategoryToStitch('hotel').category).toBe('hotels');
      expect(mapCategoryToStitch('temple').category).toBe('attractions');
      expect(mapCategoryToStitch('museum').category).toBe('attractions');
      expect(mapCategoryToStitch(null).category).toBe('all');
    });
  });

  describe('SupabaseSavedPlacesRepository', () => {
    it('lists saved places and maps them to domain models', async () => {
      const mockRpc = jest.fn().mockReturnValue({
        abortSignal: jest.fn().mockResolvedValue({
          data: {
            items: [
              {
                id: '123e4567-e89b-12d3-a456-426614174000',
                googlePlaceId: 'ChIJaSv_6gaZ4jARnbiUVn6Z_YY',
                placeName: 'Chùa Arun',
                latitude: 13.7437,
                longitude: 100.4888,
                placeAddress: 'Bangkok, Thailand',
                placeCategory: 'landmark',
                createdAt: '2026-08-22T12:00:00.000Z',
              },
            ],
            nextCursor: null,
          },
          error: null,
        }),
      });

      const client: any = { rpc: mockRpc };
      const repo = new SupabaseSavedPlacesRepository(client);

      const result = await repo.listSavedPlaces();
      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe('Chùa Arun');
      expect(result.items[0].googlePlaceId).toBe('ChIJaSv_6gaZ4jARnbiUVn6Z_YY');
    });

    it('saves place idempotently', async () => {
      const mockRpc = jest.fn().mockReturnValue({
        abortSignal: jest.fn().mockResolvedValue({
          data: {
            id: '123e4567-e89b-12d3-a456-426614174000',
            googlePlaceId: 'ChIJaSv_6gaZ4jARnbiUVn6Z_YY',
            placeName: 'Chùa Arun',
            latitude: 13.7437,
            longitude: 100.4888,
            placeAddress: 'Bangkok, Thailand',
            placeCategory: 'landmark',
            createdAt: '2026-08-22T12:00:00.000Z',
          },
          error: null,
        }),
      });

      const client: any = { rpc: mockRpc };
      const repo = new SupabaseSavedPlacesRepository(client);

      const saved = await repo.savePlace({
        googlePlaceId: 'ChIJaSv_6gaZ4jARnbiUVn6Z_YY',
        name: 'Chùa Arun',
        latitude: 13.7437,
        longitude: 100.4888,
      });

      expect(saved.googlePlaceId).toBe('ChIJaSv_6gaZ4jARnbiUVn6Z_YY');
      expect(saved.name).toBe('Chùa Arun');
    });

    it('unsaves place and returns true', async () => {
      const mockRpc = jest.fn().mockReturnValue({
        abortSignal: jest.fn().mockResolvedValue({
          data: true,
          error: null,
        }),
      });

      const client: any = { rpc: mockRpc };
      const repo = new SupabaseSavedPlacesRepository(client);

      const result = await repo.unsavePlace('ChIJaSv_6gaZ4jARnbiUVn6Z_YY');
      expect(result).toBe(true);
      expect(mockRpc).toHaveBeenCalledWith('unsave_place', {
        p_google_place_id: 'ChIJaSv_6gaZ4jARnbiUVn6Z_YY',
      });
    });
  });
});
