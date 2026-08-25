type FsModule = {
  readFileSync: (path: string, encoding: "utf8") => string;
};
declare function require(moduleName: "fs"): FsModule;

const { readFileSync } = require("fs");

describe("get-place-photo Edge Function source integrity", () => {
  it("keeps service-role and ownership filters in valid template literals", () => {
    const source = readFileSync(
      "../supabase/functions/get-place-photo/index.ts",
      "utf8",
    );

    expect(source).toContain("authorization: `Bearer ${serviceRoleKey}`");
    expect(source).toContain(
      "select: 'id,itinerary_days!inner(trips!inner(user_id))'",
    );
    expect(source).toContain("google_place_id: `eq.${googlePlaceId}`");
    expect(source).toContain("'itinerary_days.trips.user_id': `eq.${ownerId}`");
    expect(source).toContain("user_id: `eq.${ownerId}`");
    expect(source).toContain(
      "fetch(`${supabaseUrl}/rest/v1/itinerary_items?${itemQuery}`",
    );
    expect(source).toContain(
      "fetch(`${supabaseUrl}/rest/v1/saved_places?${savedQuery}`",
    );
  });
});
