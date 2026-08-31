import { getActivityCardProgress } from '../activityCardFrames';
import { getDayIndicatorProgress } from '../dayIndicatorFrames';
import {
  getGenerationCompositionStage,
  getGenerationSheetSlot,
  getGenerationSheetTransitionProgress,
  getGenerationSheetTranslateY,
  getGenerationUnderstandingOpacity,
  getItineraryBuildingOpacity,
} from '../generationPresentationFrames';
import { getRouteLineProgress } from '../routeNodeFrames';

describe('corrective F000–F151 generation presentation checkpoints', () => {
  it('keeps the Stage-0 composition clear before the route starts at F024', () => {
    expect(getGenerationCompositionStage(0)).toBe('initial');
    expect(getGenerationCompositionStage(23)).toBe('initial');
    expect(getRouteLineProgress(0)).toBe(0);
    expect(getActivityCardProgress(0, 0)).toBe(0);
  });

  it('uses the audited route and alternating card sequence at F024, F048, and F095', () => {
    expect(getGenerationCompositionStage(24)).toBe('route-and-activities');
    expect(getRouteLineProgress(24)).toBe(0);
    expect(getActivityCardProgress(24, 0)).toBe(0);

    expect(getGenerationCompositionStage(48)).toBe('route-and-activities');
    expect(getRouteLineProgress(48)).toBeCloseTo(1 / 3);
    expect(getActivityCardProgress(48, 0)).toBe(1);
    expect(getActivityCardProgress(48, 1)).toBe(0);

    expect(getGenerationCompositionStage(95)).toBe('route-and-activities');
    expect(getRouteLineProgress(95)).toBe(1);
    expect(getActivityCardProgress(95, 0)).toBe(1);
    expect(getActivityCardProgress(95, 1)).toBe(1);
    expect(getActivityCardProgress(95, 2)).toBe(1);
  });

  it('crossfades generation-understanding into itinerary-building from F110 and holds the latter at F151', () => {
    expect(getGenerationSheetTransitionProgress(109)).toBe(0);
    expect(getGenerationUnderstandingOpacity(109)).toBe(1);
    expect(getItineraryBuildingOpacity(109)).toBe(0);
    expect(getGenerationSheetSlot(109)).toBe('generation-understanding');

    expect(getGenerationSheetTransitionProgress(110)).toBe(0);
    expect(getGenerationUnderstandingOpacity(110)).toBe(1);
    expect(getItineraryBuildingOpacity(110)).toBe(0);

    expect(getGenerationSheetTransitionProgress(115)).toBe(0.5);
    expect(getGenerationUnderstandingOpacity(115)).toBe(0.5);
    expect(getItineraryBuildingOpacity(115)).toBe(0.5);
    expect(getGenerationSheetSlot(115)).toBe('itinerary-building');

    expect(getGenerationSheetTransitionProgress(150)).toBe(1);
    expect(getGenerationUnderstandingOpacity(150)).toBe(0);
    expect(getItineraryBuildingOpacity(150)).toBe(1);
    expect(getGenerationSheetSlot(150)).toBe('itinerary-building');
    expect(getGenerationSheetTranslateY(150)).toBe(-12);

    expect(getGenerationCompositionStage(151)).toBe('generation-hold');
    expect(getDayIndicatorProgress(151, 0, 3)).toBe(1);
    expect(getDayIndicatorProgress(151, 1, 3)).toBe(1);
    expect(getDayIndicatorProgress(151, 2, 3)).toBe(1);
    expect(getItineraryBuildingOpacity(151)).toBe(1);
    expect(getItineraryBuildingOpacity(152)).toBe(1);
    expect(getGenerationSheetTranslateY(151)).toBe(-12);
    expect(getGenerationSheetTranslateY(152)).toBe(-12);
  });
});