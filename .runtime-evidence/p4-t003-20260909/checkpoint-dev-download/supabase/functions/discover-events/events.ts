// T003 backend checkpoint. No persistence, pagination, retry or client-controlled URLs.
export const BOUNDS = {
  requestBytes: 2048,
  providerBytes: 262144,
  responseBytes: 16384,
  timeoutMs: 8000,
  limit: 3,
  windowMs: 7 * 86400000,
} as const;
const ENDPOINT = "https://app.ticketmaster.com/discovery/v2/events.json";
export class EventError extends Error {
  constructor(readonly code: string, readonly status: number) {
    super("Event discovery is unavailable.");
  }
}
const invalid = (): never => {
  throw new EventError("EVENT_PROVIDER_INVALID_RESPONSE", 502);
};
const record = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v);
function text(v: unknown, max: number): string {
  if (
    typeof v !== "string" || !v.trim() || v.length > max ||
    Array.from(v).some((char) =>
      char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127
    )
  ) return invalid();
  return v;
}
function id(v: unknown): string {
  const s = text(v, 200);
  if (!/^[A-Za-z0-9_-]+$/.test(s)) return invalid();
  return s;
}
function date(v: unknown): string {
  const s = text(v, 10);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(s) ||
    !Number.isFinite(Date.parse(s + "T00:00:00Z")) ||
    new Date(s + "T00:00:00Z").toISOString().slice(0, 10) !== s
  ) return invalid();
  return s;
}
export function utc(v: unknown): string {
  const s = text(v, 24);
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(s) ||
    !Number.isFinite(Date.parse(s))
  ) return invalid();
  if (
    new Date(s).toISOString() !==
      (s.length === 20 ? s.replace("Z", ".000Z") : s)
  ) return invalid();
  return s;
}
export type Query = {
  city: string;
  countryCode: string;
  startDateTime: string;
  endDateTime: string;
  limit: number;
};
export function parseQuery(v: unknown): Query {
  try {
    if (
      !record(v) || Object.keys(v).length !== 5 ||
      Object.keys(v).some((k) =>
        !["city", "countryCode", "startDateTime", "endDateTime", "limit"]
          .includes(k)
      )
    ) return invalid();
    const city = text(v.city, 100);
    if (
      city !== city.trim() || !/^[\p{L}\p{M} .'-]+$/u.test(city) ||
      typeof v.countryCode !== "string" || !/^[A-Z]{2}$/.test(v.countryCode)
    ) return invalid();
    const startDateTime = utc(v.startDateTime),
      endDateTime = utc(v.endDateTime);
    const span = Date.parse(endDateTime) - Date.parse(startDateTime);
    if (
      span <= 0 || span > BOUNDS.windowMs || typeof v.limit !== "number" ||
      !Number.isInteger(v.limit) || v.limit < 1 || v.limit > 3
    ) return invalid();
    return {
      city,
      countryCode: v.countryCode,
      startDateTime,
      endDateTime,
      limit: v.limit,
    };
  } catch {
    throw new EventError("EVENT_INPUT_INVALID", 400);
  }
}
type EventTime = {
  kind: "UTC" | "PROVIDER_LOCAL";
  dateTime?: string;
  localDate?: string;
  localTime?: string;
  timezone?: string;
  dateTBD?: boolean;
  dateTBA?: boolean;
  timeTBA?: boolean;
  noSpecificTime?: boolean;
};
function time(v: unknown, zone: unknown): EventTime {
  if (!record(v)) return invalid();
  const result: EventTime = {
    kind: v.dateTime === undefined ? "PROVIDER_LOCAL" : "UTC",
  };
  if (v.dateTime !== undefined) result.dateTime = utc(v.dateTime);
  if (v.localDate !== undefined) result.localDate = date(v.localDate);
  if (v.localTime !== undefined) {
    const s = text(v.localTime, 8);
    if (!/^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(s) || !result.localDate) {
      return invalid();
    }
    result.localTime = s;
  }
  if (!result.dateTime && !result.localDate) return invalid();
  if (zone !== undefined) {
    result.timezone = text(zone, 100);
    try {
      new Intl.DateTimeFormat("en", { timeZone: result.timezone });
    } catch {
      return invalid();
    }
  }
  for (
    const flag of ["dateTBD", "dateTBA", "timeTBA", "noSpecificTime"] as const
  ) {
    if (v[flag] !== undefined) {
      if (typeof v[flag] !== "boolean") return invalid();
      result[flag] = v[flag];
    }
  }
  // A supplied absolute clock cannot simultaneously be declared unknown/non-specific.
  if (
    result.dateTime &&
    (result.dateTBD || result.dateTBA || result.timeTBA ||
      result.noSpecificTime)
  ) return invalid();
  return result;
}
function coordinate(v: unknown, max: number): number {
  if (
    typeof v !== "number" &&
    (typeof v !== "string" || !/^-?\d{1,3}(?:\.\d{1,15})?$/.test(v))
  ) return invalid();
  const n = Number(v);
  if (!Number.isFinite(n) || Math.abs(n) > max) return invalid();
  return n;
}
function venue(v: unknown) {
  if (!record(v) || (v.type !== undefined && v.type !== "venue")) {
    return invalid();
  }
  const result: {
    providerVenueId?: string;
    name?: string;
    location?: { latitude: number; longitude: number };
  } = {};
  if (v.id !== undefined) result.providerVenueId = id(v.id);
  if (v.name !== undefined) result.name = text(v.name, 200);
  if (v.location !== undefined) {
    if (!record(v.location)) return invalid();
    result.location = {
      latitude: coordinate(v.location.latitude, 90),
      longitude: coordinate(v.location.longitude, 180),
    };
  }
  return result;
}
export function parseProvider(v: unknown, limit: number, observedAt: string) {
  if (!record(v) || !record(v.page)) return invalid();
  const page = v.page;
  for (const k of ["size", "number", "totalElements", "totalPages"]) {
    if (!Number.isSafeInteger(page[k]) || (page[k] as number) < 0) {
      return invalid();
    }
  }
  if (page.number !== 0 || (page.size as number) > limit) return invalid();
  let raw: unknown[] = [];
  if (v._embedded !== undefined) {
    if (!record(v._embedded) || !Array.isArray(v._embedded.events)) {
      return invalid();
    }
    raw = v._embedded.events;
  }
  if (
    raw.length > limit || raw.length > 3 ||
    raw.length > (page.totalElements as number) ||
    (!raw.length && page.totalElements !== 0)
  ) return invalid();
  const events = raw.map((item) => {
    if (
      !record(item) || item.type !== "event" || !record(item.dates) ||
      (item.test !== undefined && item.test !== false)
    ) return invalid();
    const providerEventId = id(item.id), title = text(item.name, 300);
    const start = time(item.dates.start, item.dates.timezone);
    const end = item.dates.end === undefined
      ? undefined
      : time(item.dates.end, item.dates.timezone);
    if (end) {
      if (
        start.dateTime && end.dateTime &&
        Date.parse(end.dateTime) < Date.parse(start.dateTime)
      ) return invalid();
      if (start.localDate && end.localDate && end.localDate < start.localDate) {
        return invalid();
      }
      if (
        start.localDate === end.localDate && start.localTime && end.localTime &&
        end.localTime < start.localTime
      ) return invalid();
    }
    let venues: ReturnType<typeof venue>[] | undefined;
    if (item._embedded !== undefined) {
      if (!record(item._embedded)) return invalid();
      if (item._embedded.venues !== undefined) {
        if (
          !Array.isArray(item._embedded.venues) ||
          item._embedded.venues.length > 3
        ) return invalid();
        venues = item._embedded.venues.map(venue);
      }
    }
    // URLs/images are deliberately omitted in this checkpoint; no unverified links or branding assets.
    return {
      provider: "ticketmaster" as const,
      providerEventId,
      title,
      start,
      ...(end ? { end } : {}),
      ...(venues ? { venues } : {}),
      review: "REVIEW_REQUIRED" as const,
      attribution: {
        providerName: "Ticketmaster",
        displayRequirement: "REQUIRES_FINAL_T005_REVIEW",
      },
      provenance: {
        provider: "ticketmaster",
        providerEventId,
        boundary: "discover-events",
        observation: "SERVER_RECEIVED",
        observedAt: utc(observedAt),
      },
    };
  });
  if (new Set(events.map((e) => e.providerEventId)).size !== events.length) {
    return invalid();
  }
  return {
    events,
    pagination: {
      size: page.size as number,
      number: 0,
      totalElements: page.totalElements as number,
      totalPages: page.totalPages as number,
    },
  };
}
// Same actual-byte streaming pattern as explore-places, with abort-aware reads.
export async function readJson(
  message: Request | Response,
  max: number,
  signal?: AbortSignal,
): Promise<unknown> {
  if (!message.body || Number(message.headers.get("content-length")) > max) {
    await message.body?.cancel();
    return invalid();
  }
  const reader = message.body.getReader(),
    decoder = new TextDecoder("utf-8", { fatal: true });
  let size = 0, value = "";
  const cancel = () => {
    void reader.cancel().catch(() => undefined);
  };
  signal?.addEventListener("abort", cancel, { once: true });
  try {
    while (true) {
      if (signal?.aborted) throw new EventError("EVENT_CANCELLED", 503);
      const chunk = await reader.read();
      if (signal?.aborted) throw new EventError("EVENT_CANCELLED", 503);
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > max) return invalid();
      value += decoder.decode(chunk.value, { stream: true });
    }
    return JSON.parse(value + decoder.decode());
  } finally {
    signal?.removeEventListener("abort", cancel);
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}
export async function searchEvents(
  query: Query,
  fetcher: typeof fetch,
  config: { apiKey?: string; signal?: AbortSignal; timeoutMs?: number },
) {
  query = parseQuery(query);
  if (!config.apiKey?.trim()) {
    throw new EventError("EVENT_PROVIDER_CONFIG_MISSING", 503);
  }
  const controller = new AbortController();
  const cancel = () => controller.abort();
  if (config.signal?.aborted) throw new EventError("EVENT_CANCELLED", 503);
  config.signal?.addEventListener("abort", cancel, { once: true });
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, config.timeoutMs ?? BOUNDS.timeoutMs);
  try {
    const url = new URL(ENDPOINT);
    url.search = new URLSearchParams({
      apikey: config.apiKey,
      city: query.city,
      countryCode: query.countryCode,
      startDateTime: query.startDateTime,
      endDateTime: query.endDateTime,
      size: String(query.limit),
      page: "0",
      sort: "date,asc",
      includeTest: "no",
      includeTBA: "no",
      includeTBD: "no",
    }).toString();
    const response = await fetcher(url, {
      redirect: "error",
      signal: controller.signal,
      headers: { accept: "application/json" },
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw new EventError(
        response.status === 401 || response.status === 403
          ? "EVENT_PROVIDER_AUTH"
          : response.status === 429
          ? "EVENT_PROVIDER_RATE_LIMITED"
          : "EVENT_PROVIDER_UNAVAILABLE",
        response.status === 429
          ? 429
          : response.status === 401 || response.status === 403
          ? 502
          : 503,
      );
    }
    let payload: unknown;
    try {
      payload = await readJson(
        response,
        BOUNDS.providerBytes,
        controller.signal,
      );
    } catch {
      return invalid();
    }
    if (controller.signal.aborted) throw new EventError("EVENT_CANCELLED", 503);
    const normalized = parseProvider(
      payload,
      query.limit,
      new Date().toISOString(),
    );
    const rateLimitHeaders: Record<string, string> = {};
    for (
      const key of [
        "rate-limit",
        "rate-limit-available",
        "rate-limit-over",
        "rate-limit-reset",
        "retry-after",
      ]
    ) {
      const value = response.headers.get(key);
      if (value !== null && /^\d{1,16}$/.test(value)) {
        rateLimitHeaders[key] = value;
      }
    }
    const result = {
      ...normalized,
      providerAccess: {
        httpStatus: response.status,
        completedProviderCalls: 1,
        rateLimitHeaders,
      },
    };
    if (JSON.stringify(result).includes(config.apiKey)) return invalid();
    return result;
  } catch (error) {
    if (controller.signal.aborted) {
      throw new EventError(
        timedOut ? "EVENT_PROVIDER_TIMEOUT" : "EVENT_CANCELLED",
        timedOut ? 504 : 503,
      );
    }
    if (error instanceof EventError) throw error;
    throw new EventError("EVENT_PROVIDER_UNAVAILABLE", 503);
  } finally {
    clearTimeout(timer);
    config.signal?.removeEventListener("abort", cancel);
  }
}
type Dependencies = {
  authenticate(request: Request): Promise<string | null>;
  search(query: Query, signal: AbortSignal): ReturnType<typeof searchEvents>;
};
export async function handleRequest(
  request: Request,
  deps: Dependencies,
): Promise<Response> {
  const headers = {
    "content-type": "application/json",
    "cache-control": "no-store",
  };
  try {
    if (request.method !== "POST") {
      throw new EventError("EVENT_INPUT_INVALID", 405);
    }
    if (!await deps.authenticate(request)) {
      throw new EventError("UNAUTHORIZED", 401);
    }
    let body: unknown;
    try {
      body = await readJson(request, BOUNDS.requestBytes, request.signal);
    } catch {
      throw new EventError("EVENT_INPUT_INVALID", 400);
    }
    const query = parseQuery(body);
    if (request.signal.aborted) throw new EventError("EVENT_CANCELLED", 503);
    const data = await deps.search(query, request.signal);
    if (request.signal.aborted) throw new EventError("EVENT_CANCELLED", 503);
    const serialized = JSON.stringify({ data });
    if (
      data.events.length > query.limit ||
      new TextEncoder().encode(serialized).length > BOUNDS.responseBytes
    ) return invalid();
    return new Response(serialized, { headers });
  } catch (error) {
    const safe = error instanceof EventError
      ? error
      : new EventError("INTERNAL_ERROR", 500);
    return new Response(
      JSON.stringify({ error: { code: safe.code, message: safe.message } }),
      { status: safe.status, headers },
    );
  }
}
