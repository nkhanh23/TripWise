import type { ResolvedImage, TripCoverImageRequest } from "./contracts";
import type {
  DestinationCoverRepository,
  PlaceImageRepository,
  PlacePhotoRepository,
  TripCoverImageRepository,
  WikimediaImageRepository,
} from "./repositories";

export const maximumTripImageResolutionAttempts = 5;
export const maximumConcurrentImageRequests = 3;

const placeholder: ResolvedImage = { uri: null, source: "PLACEHOLDER" };

function googleImage(
  photo: Awaited<ReturnType<PlacePhotoRepository["getPhoto"]>>,
): ResolvedImage {
  if (!photo.photoUri) return placeholder;
  const author = photo.authorAttribution;
  return {
    uri: photo.photoUri,
    source: "GOOGLE_PLACE",
    ...(author?.displayName && author.uri
      ? {
          attribution: {
            displayName: author.displayName,
            sourceUrl: author.uri,
          },
        }
      : {}),
  };
}

async function safelyResolve(
  action: () => Promise<ResolvedImage>,
): Promise<ResolvedImage> {
  try {
    return await action();
  } catch {
    return placeholder;
  }
}

export class CompositePlaceImageRepository implements PlaceImageRepository {
  constructor(
    private readonly google: PlacePhotoRepository,
    private readonly wikimedia: WikimediaImageRepository,
  ) {}

  async getPlaceImage(
    request: { googlePlaceId: string; maxWidth?: number },
    signal?: AbortSignal,
  ) {
    const google = await safelyResolve(async () =>
      googleImage(await this.google.getPhoto(request, signal)),
    );
    if (google.uri) return google;
    const wikimedia = await safelyResolve(() =>
      this.wikimedia.getImage(
        {
          kind: "PLACE",
          googlePlaceId: request.googlePlaceId,
          ...(request.maxWidth ? { maxWidth: request.maxWidth } : {}),
        },
        signal,
      ),
    );
    return wikimedia.uri && wikimedia.source === "WIKIMEDIA_PLACE"
      ? wikimedia
      : placeholder;
  }
}

export class SequentialTripCoverImageRepository implements TripCoverImageRepository {
  constructor(
    private readonly google: PlacePhotoRepository,
    private readonly wikimedia: WikimediaImageRepository,
    private readonly destination: DestinationCoverRepository,
  ) {}

  async getTripCover(
    request: TripCoverImageRequest,
    signal?: AbortSignal,
  ): Promise<ResolvedImage> {
    const candidates = [...new Set(request.googlePlaceIds)].slice(0, 2);
    for (const googlePlaceId of candidates) {
      const image = await safelyResolve(async () =>
        googleImage(
          await this.google.getPhoto(
            {
              googlePlaceId,
              ...(request.maxWidth ? { maxWidth: request.maxWidth } : {}),
            },
            signal,
          ),
        ),
      );
      if (image.uri) return image;
    }
    for (const googlePlaceId of candidates) {
      const image = await safelyResolve(() =>
        this.wikimedia.getImage(
          {
            kind: "PLACE",
            googlePlaceId,
            ...(request.maxWidth ? { maxWidth: request.maxWidth } : {}),
          },
          signal,
        ),
      );
      if (image.uri && image.source === "WIKIMEDIA_PLACE") return image;
    }
    const destination = await safelyResolve(() =>
      this.destination.getDestinationCover(
        request.destination,
        request.maxWidth,
        signal,
      ),
    );
    return destination.uri && destination.source === "DESTINATION_COVER"
      ? destination
      : placeholder;
  }
}
