jest.mock("../src/lib/supabase/client", () => ({
  supabase: { functions: { invoke: jest.fn() } },
}));

import { supabase } from "../src/lib/supabase/client";
import {
  generateTrip,
  mapGenerateTripErrorPayload,
} from "../src/features/planner/data/generateTrip";

const mockInvoke = supabase.functions.invoke as jest.Mock;

const input = {
  destination: "Nha Trang",
  startDate: "2026-09-01",
  endDate: "2026-09-01",
};
const generatedTrip = {
  title: "Một ngày ở Nha Trang",
  destination: "Nha Trang",
  startDate: "2026-09-01",
  endDate: "2026-09-01",
  days: [
    {
      dayNumber: 1,
      date: "2026-09-01",
      items: [{ position: 1, placeName: "Bãi biển Nha Trang" }],
    },
  ],
};

describe("generateTrip mobile client", () => {
  beforeEach(() => mockInvoke.mockReset());

  it("invokes the authenticated Supabase function and maps its typed result", async () => {
    mockInvoke.mockResolvedValue({
      data: { data: generatedTrip },
      error: null,
    });
    await expect(generateTrip(input)).resolves.toEqual(generatedTrip);
    expect(mockInvoke).toHaveBeenCalledWith("generate-trip", { body: input });
  });

  it("rejects malformed success payloads", async () => {
    mockInvoke.mockResolvedValue({
      data: { data: { title: "Incomplete" } },
      error: null,
    });
    await expect(generateTrip(input)).rejects.toMatchObject({
      code: "AI_INVALID_RESPONSE",
    });
  });

  it("maps the stable Edge Function error contract without exposing unknown details", () => {
    expect(
      mapGenerateTripErrorPayload({
        error: { code: "AI_TIMEOUT", message: "AI generation timed out." },
      }),
    ).toMatchObject({ code: "AI_TIMEOUT" });
    expect(
      mapGenerateTripErrorPayload({
        error: { code: "UNTRUSTED", message: "raw internals" },
      }),
    ).toMatchObject({ code: "INTERNAL_ERROR" });
  });

  it("maps a response-like function error in React Native without relying on instanceof Response", async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: {
        context: {
          clone: () => ({
            json: async () => ({
              error: {
                code: "AI_UNAVAILABLE",
                message: "AI service is temporarily unavailable.",
              },
            }),
          }),
        },
      },
    });

    await expect(generateTrip(input)).rejects.toMatchObject({
      code: "AI_UNAVAILABLE",
    });
  });
});
