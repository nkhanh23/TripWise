import { WikimediaImageError } from './errors.ts';
import type { TrustedPlaceContext, WikimediaImageResult } from './types.ts';

const endpoint = 'https://commons.wikimedia.org/w/api.php';
const defaultTimeoutMilliseconds = 8_000;
const candidateLimit = 5;
const userAgent = 'TripWise/1.0 (https://github.com/nkhanh23/TripWise)';
const stopWords = new Set([
  'a', 'an', 'and', 'at', 'city', 'in', 'of', 'the',
]);

type MetadataValue = { value?: unknown };
type WikimediaPage = {
  title?: unknown;
  imageinfo?: Array<{
    url?: unknown;
    thumburl?: unknown;
    descriptionurl?: unknown;
    extmetadata?: Record<string, MetadataValue>;
  }>;
};
type WikimediaResponse = {
  query?: { pages?: Record<string, WikimediaPage> };
};

type Candidate = {
  title: string;
  uri: string;
  sourceUrl: string;
  creator: string;
  license: string;
  licenseUrl?: string;
  haystack: string;
  latitude?: number;
  longitude?: number;
};

function cleanText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/<[^>]+>/gu, ' ')
    .replace(/&quot;/gu, '"')
    .replace(/&#39;|&apos;/gu, "'")
    .replace(/&amp;/gu, '&')
    .replace(/&nbsp;/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
}

function normalize(value: string): string {
  return value.normalize('NFKD')
    .replace(/[\u0300-\u036f]/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, ' ')
    .trim();
}

function significantTokens(value: string): string[] {
  return normalize(value).split(' ')
    .filter((token) => token.length >= 2 && !stopWords.has(token));
}

function metadataValue(metadata: Record<string, MetadataValue> | undefined, key: string): string {
  return cleanText(metadata?.[key]?.value);
}

function finiteMetadataNumber(metadata: Record<string, MetadataValue> | undefined, key: string): number | undefined {
  const parsed = Number(metadataValue(metadata, key));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function supportedLicense(value: string): boolean {
  const normalized = normalize(value);
  return normalized.startsWith('cc by')
    || normalized === 'cc0'
    || normalized.includes('public domain');
}

function candidateFromPage(page: WikimediaPage): Candidate | null {
  const info = Array.isArray(page.imageinfo) ? page.imageinfo[0] : undefined;
  const metadata = info?.extmetadata;
  const title = cleanText(page.title);
  const uri = cleanText(info?.thumburl || info?.url);
  const sourceUrl = cleanText(info?.descriptionurl);
  const creator = metadataValue(metadata, 'Artist') || metadataValue(metadata, 'Credit');
  const license = metadataValue(metadata, 'LicenseShortName') || metadataValue(metadata, 'UsageTerms');
  const licenseUrl = metadataValue(metadata, 'LicenseUrl') || undefined;
  if (!title || !uri.startsWith('https://upload.wikimedia.org/')
    || !sourceUrl.startsWith('https://commons.wikimedia.org/')
    || !creator || !license || !supportedLicense(license)) return null;

  const haystack = normalize([
    title,
    metadataValue(metadata, 'ObjectName'),
    metadataValue(metadata, 'ImageDescription'),
    metadataValue(metadata, 'Categories'),
    metadataValue(metadata, 'Credit'),
  ].join(' '));
  return {
    title,
    uri,
    sourceUrl,
    creator,
    license,
    licenseUrl,
    haystack,
    latitude: finiteMetadataNumber(metadata, 'GPSLatitude'),
    longitude: finiteMetadataNumber(metadata, 'GPSLongitude'),
  };
}

function distanceKilometers(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const latitudeDelta = radians(bLat - aLat);
  const longitudeDelta = radians(bLon - aLon);
  const h = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(aLat)) * Math.cos(radians(bLat)) * Math.sin(longitudeDelta / 2) ** 2;
  return 6_371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function candidateMatchesPlace(candidate: Candidate, context: TrustedPlaceContext): number | null {
  const locationTokenSet = new Set(
    significantTokens(`${context.destination ?? ''} ${context.placeAddress ?? ''}`),
  );
  const aliases = [context.placeName, context.placeQuery].filter((value): value is string => Boolean(value));
  const entityMatched = aliases.some((alias) => {
    const normalizedAlias = normalize(alias);
    const tokens = significantTokens(alias).filter((token) => !locationTokenSet.has(token));
    return (normalizedAlias.length >= 6 && candidate.haystack.includes(normalizedAlias))
      || (tokens.length >= 1 && tokens.every((token) => candidate.haystack.includes(token)));
  });
  if (!entityMatched) return null;

  const locationTokens = [...locationTokenSet]
    .filter((token) => token.length >= 4);
  const metadataLocationMatched = locationTokens.some((token) => candidate.haystack.includes(token));
  const coordinateMatched = candidate.latitude !== undefined && candidate.longitude !== undefined
    && distanceKilometers(context.latitude, context.longitude, candidate.latitude, candidate.longitude) <= 5;
  if (!metadataLocationMatched && !coordinateMatched) return null;
  return coordinateMatched ? 0.99 : 0.95;
}

function candidateMatchesDestination(candidate: Candidate, destination: string): number | null {
  const [city = destination, ...context] = destination.split(',').map((part) => part.trim());
  const tokens = significantTokens(city);
  if (tokens.length === 0 || !tokens.every((token) => candidate.haystack.includes(token))) return null;
  const contextSegments = context
    .map(significantTokens)
    .filter((segment) => segment.length > 0);
  // A destination identity that includes region/country must be corroborated by
  // the candidate metadata for every supplied geographic segment. Otherwise a
  // same-name city such as Paris, Texas can never stand in for Paris, France.
  const contextMatched = contextSegments.every((segment) =>
    segment.every((token) => candidate.haystack.includes(token))
  );
  if (contextSegments.length > 0 && !contextMatched) return null;
  return contextSegments.length > 0 ? 0.9 : 0.88;
}

function providerError(status: number): WikimediaImageError {
  if (status === 429) {
    return new WikimediaImageError('WIKIMEDIA_RATE_LIMITED', 'Wikimedia rate limit was reached.', 429);
  }
  return new WikimediaImageError('WIKIMEDIA_UNAVAILABLE', 'Wikimedia is temporarily unavailable.', 503);
}

async function candidatesFor(
  query: string,
  maxWidth: number,
  fetcher: typeof fetch,
): Promise<Candidate[]> {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    generator: 'search',
    gsrsearch: query,
    gsrnamespace: '6',
    gsrlimit: String(candidateLimit),
    prop: 'imageinfo',
    iiprop: 'url|extmetadata',
    iiurlwidth: String(maxWidth),
    maxlag: '2',
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), defaultTimeoutMilliseconds);
  try {
    const response = await fetcher(`${endpoint}?${params}`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        accept: 'application/json',
        'api-user-agent': userAgent,
        'user-agent': userAgent,
      },
    });
    if (!response.ok) throw providerError(response.status);
    const body = (await response.json()) as WikimediaResponse;
    return Object.values(body.query?.pages ?? {})
      .map(candidateFromPage)
      .filter((candidate): candidate is Candidate => candidate !== null);
  } catch (error) {
    if (error instanceof WikimediaImageError) throw error;
    throw new WikimediaImageError('WIKIMEDIA_UNAVAILABLE', 'Wikimedia is temporarily unavailable.', 503);
  } finally {
    clearTimeout(timeout);
  }
}

function result(candidate: Candidate, source: WikimediaImageResult['source'], confidence: number): WikimediaImageResult {
  return {
    uri: candidate.uri,
    source,
    matchedEntity: candidate.title,
    confidence,
    attribution: {
      displayName: candidate.creator,
      sourceUrl: candidate.sourceUrl,
      license: candidate.license,
      ...(candidate.licenseUrl ? { licenseUrl: candidate.licenseUrl } : {}),
    },
  };
}

export async function fetchExactPlaceImageFromWikimedia(
  context: TrustedPlaceContext,
  maxWidth = 800,
  fetcher: typeof fetch = fetch,
): Promise<WikimediaImageResult> {
  const query = `${context.placeQuery ?? context.placeName} ${context.destination ?? context.placeAddress ?? ''}`.trim();
  const candidates = await candidatesFor(query, maxWidth, fetcher);
  const matches = candidates
    .map((candidate) => ({ candidate, confidence: candidateMatchesPlace(candidate, context) }))
    .filter((entry): entry is { candidate: Candidate; confidence: number } => entry.confidence !== null)
    .sort((left, right) => right.confidence - left.confidence);
  return matches[0]
    ? result(matches[0].candidate, 'WIKIMEDIA_PLACE', matches[0].confidence)
    : { uri: null, source: 'WIKIMEDIA_PLACE' };
}

export async function fetchDestinationCoverFromWikimedia(
  destination: string,
  maxWidth = 800,
  fetcher: typeof fetch = fetch,
): Promise<WikimediaImageResult> {
  // Commons search treats extra terms as required. Searching the verified city
  // identity first returns real city files instead of an empty candidate set.
  const candidates = await candidatesFor(destination, maxWidth, fetcher);
  const matches = candidates
    .map((candidate) => ({ candidate, confidence: candidateMatchesDestination(candidate, destination) }))
    .filter((entry): entry is { candidate: Candidate; confidence: number } => entry.confidence !== null)
    .sort((left, right) => right.confidence - left.confidence);
  return matches[0]
    ? result(matches[0].candidate, 'DESTINATION_COVER', matches[0].confidence)
    : { uri: null, source: 'DESTINATION_COVER' };
}
