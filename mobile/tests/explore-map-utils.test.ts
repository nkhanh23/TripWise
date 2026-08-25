import { mapFixturePlaceToCoordinate } from "../src/features/explore/utils/exploreMapUtils";
import { mockExplorePlaces } from "../src/features/explore/data/mockPlaces";

describe("explore fixture map coordinates", () => {
  it("maps fixture percentages into the deterministic Bangkok demo viewport", () => {
    const coordinate = mapFixturePlaceToCoordinate(mockExplorePlaces[0]);

    expect(coordinate.latitude).toBeCloseTo(13.7744, 4);
    expect(coordinate.longitude).toBeCloseTo(100.516, 4);
  });

  it("clamps out-of-range fixture percentages", () => {
    const coordinate = mapFixturePlaceToCoordinate({
      ...mockExplorePlaces[0],
      mapCoordinate: { topPercent: 200, leftPercent: -20 },
    });

    expect(coordinate.latitude).toBeCloseTo(13.7, 4);
    expect(coordinate.longitude).toBeCloseTo(100.42, 4);
  });
});
