const fs = require('fs');

const testFile = 'mobile/tests/ExploreMapCanvas.test.tsx';
const content = `import { render, fireEvent, act } from '@testing-library/react-native';
import React from 'react';
import { View } from 'react-native';

// Mock react-native-maps before importing ExploreMapCanvas
jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockMapView = (props: any) => {
    return (
      <View testID="map-view" {...props}>
        {props.children}
      </View>
    );
  };
  MockMapView.Marker = (props: any) => <View testID="map-marker" {...props}>{props.children}</View>;
  MockMapView.PROVIDER_GOOGLE = 'google';
  return {
    __esModule: true,
    default: MockMapView,
    Marker: MockMapView.Marker,
    PROVIDER_GOOGLE: 'google',
  };
});

import { ExploreMapCanvas } from '../src/features/explore/components/ExploreMapCanvas';

describe('ExploreMapCanvas Real Native Wiring', () => {
  const mockPlace = {
    id: 'p1',
    googlePlaceId: 'g1',
    name: 'Real Place',
    category: 'attractions' as const,
    categoryLabel: 'Attraction',
    iconName: 'attractions' as const,
    coordinate: { latitude: 1, longitude: 1 },
  };

  it('B: Real movement wiring - onPanDrag and onRegionChangeComplete', () => {
    const onMovementStateChange = jest.fn();
    const onRegionChangeComplete = jest.fn();
    
    const { getByTestId } = render(
      <ExploreMapCanvas
        status="ready"
        markersDimmed={false}
        markerItems={[]}
        selectedPlaceId={null}
        onMovementStateChange={onMovementStateChange}
        onSelectPlace={jest.fn()}
        onDismissSelection={jest.fn()}
        onRegionChangeComplete={onRegionChangeComplete}
      />
    );

    const map = getByTestId('map-view');
    
    // Test onPanDrag (start movement)
    act(() => {
      map.props.onPanDrag();
    });
    expect(onMovementStateChange).toHaveBeenCalledWith(true);

    // Test onRegionChangeComplete (end movement)
    const newRegion = { latitude: 2, longitude: 2, latitudeDelta: 0.1, longitudeDelta: 0.1 };
    act(() => {
      map.props.onRegionChangeComplete(newRegion, { isGesture: true });
    });
    expect(onMovementStateChange).toHaveBeenCalledWith(false);
    expect(onRegionChangeComplete).toHaveBeenCalledWith(newRegion, { isGesture: true });
  });

  it('C: Real hint rendering in moving state', () => {
    const { getAllByTestId, queryAllByTestId, rerender } = render(
      <ExploreMapCanvas
        status="ready"
        markersDimmed={false}
        markerItems={[]}
        selectedPlaceId={null}
        onMovementStateChange={jest.fn()}
        onSelectPlace={jest.fn()}
        onDismissSelection={jest.fn()}
      />
    );

    // No hints when ready
    expect(queryAllByTestId('explore-motion-hint', { includeHiddenElements: true })).toHaveLength(0);

    // Hints when moving
    rerender(
      <ExploreMapCanvas
        status="moving"
        markersDimmed={false}
        markerItems={[]}
        selectedPlaceId={null}
        onMovementStateChange={jest.fn()}
        onSelectPlace={jest.fn()}
        onDismissSelection={jest.fn()}
      />
    );

    const hints = getAllByTestId('explore-motion-hint', { includeHiddenElements: true });
    expect(hints).toHaveLength(8); // bounded
    
    // verify accessible hidden
    const hint = hints[0];
    expect(hint.props.accessible).toBe(false);
    expect(hint.props.accessibilityElementsHidden).toBe(true);
    expect(hint.props.pointerEvents).toBe('none');
  });

  it('D: Real marker dim/noninteractive', () => {
    const onSelectPlace = jest.fn();
    const { getByLabelText, rerender } = render(
      <ExploreMapCanvas
        status="ready"
        markersDimmed={false}
        markerItems={[{ type: 'place', place: mockPlace }]}
        selectedPlaceId={null}
        onMovementStateChange={jest.fn()}
        onSelectPlace={onSelectPlace}
        onDismissSelection={jest.fn()}
      />
    );

    const marker = getByLabelText('Real Place', { includeHiddenElements: true });
    expect(marker.props.disabled).toBe(false);
    
    act(() => {
      marker.props.onPress();
    });
    expect(onSelectPlace).toHaveBeenCalledTimes(1);

    // Stale/dimmed state
    rerender(
      <ExploreMapCanvas
        status="refreshing"
        markersDimmed={true}
        markerItems={[{ type: 'place', place: mockPlace }]}
        selectedPlaceId={null}
        onMovementStateChange={jest.fn()}
        onSelectPlace={onSelectPlace}
        onDismissSelection={jest.fn()}
      />
    );

    const dimmedMarker = getByLabelText('Real Place', { includeHiddenElements: true });
    expect(dimmedMarker.props.disabled).toBe(true);
    expect(dimmedMarker.props.style).toEqual(expect.arrayContaining([expect.objectContaining({ opacity: 0.5 })]));
    
    act(() => {
      // Simulate press even if disabled to verify handler protection
      if (dimmedMarker.props.onPress) dimmedMarker.props.onPress();
    });
    expect(onSelectPlace).toHaveBeenCalledTimes(1); // Still 1, no new call!
  });
});
`;

fs.writeFileSync(testFile, content);
console.log('Created ExploreMapCanvas.test.tsx');
