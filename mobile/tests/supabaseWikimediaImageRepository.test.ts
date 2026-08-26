import { SupabaseWikimediaImageRepository } from "../src/integration/remote/supabaseWikimediaImageRepository";
import { executeWithReliability } from "../src/integration/reliability";

jest.mock("../src/integration/reliability", () => ({
  executeWithReliability: jest.fn((task) => task()),
  supabaseReadPolicy: {},
}));

describe("SupabaseWikimediaImageRepository LRU Bound", () => {
  let repository: SupabaseWikimediaImageRepository;
  const mockClient = {
    functions: {
      invoke: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(1000000);
    SupabaseWikimediaImageRepository.clearCache();
    repository = new SupabaseWikimediaImageRepository(mockClient as any);
    mockClient.functions.invoke.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const generateMockResponse = (uri: string) => ({
    data: {
      data: {
        uri,
        source: "WIKIMEDIA_PLACE",
        matchedEntity: "test",
        confidence: 0.9,
        attribution: {
          displayName: "Author",
          sourceUrl: "https://example.com/author",
          license: "CC",
          licenseUrl: "https://example.com/license",
        },
      },
    },
    error: null,
  });

  it("should hit cache for subsequent requests within TTL", async () => {
    mockClient.functions.invoke.mockResolvedValueOnce(generateMockResponse("uri1"));
    const img1 = await repository.getImage({ kind: "PLACE", googlePlaceId: "valid-place-id-123" } as any);
    expect(img1.uri).toBe("uri1");
    expect(mockClient.functions.invoke).toHaveBeenCalledTimes(1);

    const img2 = await repository.getImage({ kind: "PLACE", googlePlaceId: "valid-place-id-123" } as any);
    expect(img2.uri).toBe("uri1");
    expect(mockClient.functions.invoke).toHaveBeenCalledTimes(1); // No new call
  });

  it("should evict after TTL expires", async () => {
    mockClient.functions.invoke.mockResolvedValueOnce(generateMockResponse("uri1"));
    await repository.getImage({ kind: "PLACE", googlePlaceId: "valid-place-id-123" } as any);

    // Advance by 7 hours (TTL is 6 hours)
    jest.advanceTimersByTime(1000 * 60 * 60 * 7);

    mockClient.functions.invoke.mockResolvedValueOnce(generateMockResponse("uri2"));
    const img2 = await repository.getImage({ kind: "PLACE", googlePlaceId: "valid-place-id-123" } as any);
    expect(img2.uri).toBe("uri2");
    expect(mockClient.functions.invoke).toHaveBeenCalledTimes(2);
  });

  it("should clearCache successfully", async () => {
    mockClient.functions.invoke.mockResolvedValueOnce(generateMockResponse("uri1"));
    await repository.getImage({ kind: "PLACE", googlePlaceId: "valid-place-id-123" } as any);

    SupabaseWikimediaImageRepository.clearCache();

    mockClient.functions.invoke.mockResolvedValueOnce(generateMockResponse("uri2"));
    await repository.getImage({ kind: "PLACE", googlePlaceId: "valid-place-id-123" } as any);
    expect(mockClient.functions.invoke).toHaveBeenCalledTimes(2);
  });

  it("should bound the cache to 200 items using LRU eviction", async () => {
    mockClient.functions.invoke.mockImplementation(async (fn: any, { body }: any) => {
      return generateMockResponse("uri_" + body.googlePlaceId);
    });

    // Insert 200 items
    for (let i = 0; i < 200; i++) {
      await repository.getImage({ kind: "PLACE", googlePlaceId: "valid-place-id-" + i.toString().padStart(5, '0') } as any);
    }

    expect(mockClient.functions.invoke).toHaveBeenCalledTimes(200);

    // Access p0 to make it recently used
    await repository.getImage({ kind: "PLACE", googlePlaceId: "valid-place-id-00000" } as any);

    // Insert 201st item, which should evict p1 (since p0 was just used)
    await repository.getImage({ kind: "PLACE", googlePlaceId: "valid-place-id-00200" } as any);

    mockClient.functions.invoke.mockClear();

    // p0 should still be cached
    await repository.getImage({ kind: "PLACE", googlePlaceId: "valid-place-id-00000" } as any);
    expect(mockClient.functions.invoke).toHaveBeenCalledTimes(0);

    // p1 should have been evicted
    await repository.getImage({ kind: "PLACE", googlePlaceId: "valid-place-id-00001" } as any);
    expect(mockClient.functions.invoke).toHaveBeenCalledTimes(1);
  });
});
