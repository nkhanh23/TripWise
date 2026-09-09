import assert from "node:assert/strict";
import {
  BOUNDS,
  EventError,
  handleRequest,
  parseProvider,
  parseQuery,
  searchEvents,
} from "./events.ts";
const query = {
  city: "London",
  countryCode: "GB",
  startDateTime: "2026-09-10T00:00:00Z",
  endDateTime: "2026-09-17T00:00:00Z",
  limit: 3,
};
const observed = "2026-09-09T12:00:00.000Z";
const event = () => ({
  type: "event",
  id: "test-event-1",
  name: "Test only concert",
  dates: {
    start: { dateTime: "2026-09-12T18:00:00Z" },
    timezone: "Europe/London",
  },
});
const payload = (events: unknown[] = []) => ({
  page: {
    size: 3,
    number: 0,
    totalElements: events.length,
    totalPages: events.length ? 1 : 0,
  },
  ...(events.length ? { _embedded: { events } } : {}),
});
const response = (v: unknown) => new Response(JSON.stringify(v));
const fake: typeof fetch = () => Promise.resolve(response(payload([event()])));
const config = { apiKey: "test-only-provider-key" };
const code = (expected: string) => (e: unknown) =>
  e instanceof EventError && e.code === expected;
const invalid = (fn: () => unknown) =>
  assert.throws(fn, code("EVENT_PROVIDER_INVALID_RESPONSE"));
Deno.test("strict valid query", () =>
  assert.deepEqual(parseQuery(query), query));
for (
  const [label, patch] of Object.entries({
    unknown: { url: "https://invalid.example" },
    user: { userId: "someone" },
    city: { city: "x".repeat(101) },
    country: { countryCode: "gb" },
    reversed: { endDateTime: query.startDateTime },
    window: { endDateTime: "2026-09-18T00:00:00Z" },
    invalidDate: { startDateTime: "2026-02-30T00:00:00Z" },
    offset: { startDateTime: "2026-09-10T00:00:00+00:00" },
    zero: { limit: 0 },
    high: { limit: 4 },
    fractional: { limit: 1.5 },
  })
) {
  Deno.test(
    "reject query " + label,
    () =>
      assert.throws(
        () => parseQuery({ ...query, ...patch }),
        code("EVENT_INPUT_INVALID"),
      ),
  );
}
Deno.test("missing credential makes zero calls", async () => {
  let calls = 0;
  await assert.rejects(
    searchEvents(query, () => {
      calls++;
      return fake("");
    }, {}),
    code("EVENT_PROVIDER_CONFIG_MISSING"),
  );
  assert.equal(calls, 0);
});
for (const status of [401, 403, 429, 500, 503]) {
  Deno.test("safe provider HTTP " + status, async () => {
    let calls = 0;
    await assert.rejects(
      searchEvents(query, () => {
        calls++;
        return Promise.resolve(
          new Response("raw confidential body", { status }),
        );
      }, config),
      (e) => {
        assert.ok(e instanceof EventError);
        assert.ok(!String(e).includes("confidential"));
        return code(
          status === 401 || status === 403
            ? "EVENT_PROVIDER_AUTH"
            : status === 429
            ? "EVENT_PROVIDER_RATE_LIMITED"
            : "EVENT_PROVIDER_UNAVAILABLE",
        )(e);
      },
    );
    assert.equal(calls, 1);
  });
}
Deno.test("one fixed request; no pagination or fan out; safe rate headers", async () => {
  let calls = 0;
  const result = await searchEvents(query, (input, init) => {
    calls++;
    const url = new URL(String(input));
    assert.equal(
      url.origin + url.pathname,
      "https://app.ticketmaster.com/discovery/v2/events.json",
    );
    assert.equal(url.searchParams.get("size"), "3");
    assert.equal(url.searchParams.get("page"), "0");
    assert.equal(url.searchParams.get("sort"), "date,asc");
    assert.equal(init?.redirect, "error");
    return Promise.resolve(
      new Response(JSON.stringify(payload([event()])), {
        headers: {
          "rate-limit": "5000",
          "rate-limit-reset": "secret text",
          "set-cookie": "private",
        },
      }),
    );
  }, config);
  assert.equal(calls, 1);
  assert.equal(result.providerAccess.completedProviderCalls, 1);
  assert.deepEqual(result.providerAccess.rateLimitHeaders, {
    "rate-limit": "5000",
  });
  assert.ok(!JSON.stringify(result).includes(config.apiKey));
});
const hanging: typeof fetch = (_url, init) =>
  new Promise((_resolve, reject) =>
    init?.signal?.addEventListener(
      "abort",
      () => reject(new DOMException("Abort", "AbortError")),
      { once: true },
    )
  );
Deno.test("timeout aborts provider", async () => {
  await assert.rejects(
    searchEvents(query, hanging, { ...config, timeoutMs: 5 }),
    code("EVENT_PROVIDER_TIMEOUT"),
  );
});
Deno.test("pre cancellation zero calls", async () => {
  const controller = new AbortController();
  controller.abort();
  let calls = 0;
  await assert.rejects(
    searchEvents(query, () => {
      calls++;
      return fake("");
    }, { ...config, signal: controller.signal }),
    code("EVENT_CANCELLED"),
  );
  assert.equal(calls, 0);
});
Deno.test("inflight cancellation", async () => {
  const controller = new AbortController();
  const pending = searchEvents(query, hanging, {
    ...config,
    signal: controller.signal,
  });
  controller.abort();
  await assert.rejects(pending, code("EVENT_CANCELLED"));
});
Deno.test("body read timeout cancels stream", async () => {
  let cancelled = false;
  await assert.rejects(
    searchEvents(query, () =>
      Promise.resolve(
        new Response(
          new ReadableStream({
            cancel() {
              cancelled = true;
            },
          }),
        ),
      ), { ...config, timeoutMs: 5 }),
    code("EVENT_PROVIDER_TIMEOUT"),
  );
  assert.equal(cancelled, true);
});
for (
  const [name, body] of [["oversized", "x".repeat(BOUNDS.providerBytes + 1)], [
    "malformed JSON",
    "{",
  ], ["invalid structure", "{}"]] as const
) {
  Deno.test(name + " fails closed", async () => {
    await assert.rejects(
      searchEvents(query, () => Promise.resolve(new Response(body)), config),
      code("EVENT_PROVIDER_INVALID_RESPONSE"),
    );
  });
}
Deno.test("valid empty response", () =>
  assert.deepEqual(parseProvider(payload(), 3, observed).events, []));
Deno.test("missing events with nonzero total rejected", () =>
  invalid(() =>
    parseProvider(
      { page: { size: 3, number: 0, totalElements: 1, totalPages: 1 } },
      3,
      observed,
    )
  ));
Deno.test("count and duplicate bounds", () => {
  invalid(() =>
    parseProvider(payload([event(), event(), event(), event()]), 3, observed)
  );
  invalid(() => parseProvider(payload([event(), event()]), 3, observed));
  invalid(() => parseProvider(payload([event()]), 0, observed));
});
for (
  const bad of [undefined, "", "id with space", "../bad", 5, "x".repeat(201)]
) {
  Deno.test(
    "invalid identity " + String(bad).slice(0, 15),
    () =>
      invalid(() =>
        parseProvider(payload([{ ...event(), id: bad }]), 3, observed)
      ),
  );
}
Deno.test("valid UTC, provenance, attribution, optional end/venue", () => {
  const e = parseProvider(payload([event()]), 3, observed).events[0];
  assert.equal(e.start.dateTime, "2026-09-12T18:00:00Z");
  assert.equal(e.start.kind, "UTC");
  assert.equal(e.provenance.observedAt, observed);
  assert.equal(e.provenance.providerEventId, e.providerEventId);
  assert.equal(e.attribution.providerName, "Ticketmaster");
  assert.equal(e.review, "REVIEW_REQUIRED");
  assert.ok(!("end" in e));
  assert.ok(!("venues" in e));
});
for (
  const value of [
    "2026-02-30T18:00:00Z",
    "2026-09-12T24:00:00Z",
    "2026-09-12T18:00:00",
    "nonsense",
  ]
) {
  Deno.test(
    "invalid time " + value,
    () =>
      invalid(() =>
        parseProvider(
          payload([{ ...event(), dates: { start: { dateTime: value } } }]),
          3,
          observed,
        )
      ),
  );
}
Deno.test("local time retains missing timezone without guessing", () => {
  const e = parseProvider(
    payload([{
      ...event(),
      dates: { start: { localDate: "2026-09-12", localTime: "19:30:00" } },
    }]),
    3,
    observed,
  ).events[0];
  assert.deepEqual(e.start, {
    kind: "PROVIDER_LOCAL",
    localDate: "2026-09-12",
    localTime: "19:30:00",
  });
});
Deno.test("date only and non-specific clock semantics", () => {
  const e = parseProvider(
    payload([{
      ...event(),
      dates: {
        start: { localDate: "2026-09-12", noSpecificTime: true },
        timezone: "Europe/London",
      },
    }]),
    3,
    observed,
  ).events[0];
  assert.equal(e.start.noSpecificTime, true);
  assert.ok(!e.start.dateTime);
  assert.ok(!e.start.localTime);
});
Deno.test("bad time flags/timezone and reverse chronology rejected", () => {
  for (
    const dates of [
      { start: { dateTime: "2026-09-12T18:00:00Z", timeTBA: true } },
      { start: {}, timezone: "Europe/London" },
      { start: { localDate: "2026-09-12" }, timezone: "invalid-zone" },
      { ...event().dates, end: { dateTime: "2026-09-11T18:00:00Z" } },
    ]
  ) invalid(() => parseProvider(payload([{ ...event(), dates }]), 3, observed));
});
Deno.test("venue identity and coordinates retained", () => {
  const e = parseProvider(
    payload([{
      ...event(),
      _embedded: {
        venues: [{
          type: "venue",
          id: "venue-1",
          name: "Test venue",
          location: { latitude: "51.5", longitude: "-0.1" },
        }],
      },
    }]),
    3,
    observed,
  ).events[0];
  assert.deepEqual(e.venues, [{
    providerVenueId: "venue-1",
    name: "Test venue",
    location: { latitude: 51.5, longitude: -0.1 },
  }]);
  assert.ok(!JSON.stringify(e).includes("google"));
});
Deno.test("venue without coordinates remains unavailable", () => {
  const e = parseProvider(
    payload([{ ...event(), _embedded: { venues: [{ id: "venue-1" }] } }]),
    3,
    observed,
  ).events[0];
  assert.deepEqual(e.venues, [{ providerVenueId: "venue-1" }]);
});
for (const latitude of ["NaN", "", "91", Infinity, null]) {
  Deno.test(
    "bad coordinate " + String(latitude),
    () =>
      invalid(() =>
        parseProvider(
          payload([{
            ...event(),
            _embedded: { venues: [{ location: { latitude, longitude: 0 } }] },
          }]),
          3,
          observed,
        )
      ),
  );
}
Deno.test("unsupported type and malformed title rejected", () => {
  for (
    const patch of [{ type: "attraction" }, { name: "" }, {
      name: "x".repeat(301),
    }, { test: true }]
  ) {
    invalid(() =>
      parseProvider(payload([{ ...event(), ...patch }]), 3, observed)
    );
  }
});
Deno.test("provider secret echoed in output fails closed", async () => {
  await assert.rejects(
    searchEvents(
      query,
      () =>
        Promise.resolve(
          response(payload([{ ...event(), name: config.apiKey }])),
        ),
      config,
    ),
    code("EVENT_PROVIDER_INVALID_RESPONSE"),
  );
});
const request = (v: unknown) =>
  new Request("https://example.invalid", {
    method: "POST",
    body: JSON.stringify(v),
  });
Deno.test("handler unauthorized and invalid requests never call provider", async () => {
  let calls = 0;
  const search = () => {
    calls++;
    return searchEvents(query, fake, config);
  };
  assert.equal(
    (await handleRequest(request(query), {
      authenticate: () => Promise.resolve(null),
      search,
    })).status,
    401,
  );
  assert.equal(
    (await handleRequest(request({ ...query, extra: "x" }), {
      authenticate: () => Promise.resolve("user"),
      search,
    })).status,
    400,
  );
  assert.equal(
    (await handleRequest(request({ city: "x".repeat(2049) }), {
      authenticate: () => Promise.resolve("user"),
      search,
    })).status,
    400,
  );
  assert.equal(calls, 0);
});
Deno.test("handler bounded normalized success and sanitized unexpected errors", async () => {
  const deps = {
    authenticate: () => Promise.resolve("user"),
    search: () => searchEvents(query, fake, config),
  };
  const result = await handleRequest(request(query), deps);
  assert.equal(result.status, 200);
  assert.equal(result.headers.get("cache-control"), "no-store");
  assert.ok((await result.text()).length <= BOUNDS.responseBytes);
  const failure = await handleRequest(request(query), {
    ...deps,
    search: () => {
      throw Error("private provider details");
    },
  });
  assert.equal(failure.status, 500);
  assert.ok(!(await failure.text()).includes("private"));
});
