import { parseSavedTripDetail } from "../src/integration/validation";
import { mapSavedTripDetailToTripDetailData } from "../src/features/trips/integrationMappers";
import rpcShape from "./fixtures/rpc-shape.json";

describe("VERIFIED mapper regression", () => {
  it("should map VERIFIED fields correctly", () => {
    // This is the shape returned by the RPC
    const parsed = parseSavedTripDetail(rpcShape);
    expect(parsed).not.toBeNull();

    const uiModel = mapSavedTripDetailToTripDetailData(parsed!);

    const item = uiModel.days[0].items[0];
    expect(item.resolution).toBe("VERIFIED");
    expect(item.latitude).toBe(13.7438652);
    expect(item.longitude).toBe(100.488444);
    expect(item.googlePlaceId).toBe("ChIJaSv_6gaZ4jARnbiUVn6Z_YY");
  });
});
