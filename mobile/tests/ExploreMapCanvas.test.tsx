// @ts-ignore
import React from 'react';
// @ts-expect-error react-test-renderer does not ship declarations in this workspace.
import TestRenderer, { act } from 'react-test-renderer';
import { StyleSheet } from 'react-native';

jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: (props: any) => <Text {...props}>{props.name}</Text>,
  };
});

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    __esModule: true,
    MaterialIcons: (props: any) => <Text {...props}>{props.name}</Text>,
  };
});

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockMapView = (props: any) => <View testID="map-view" {...props}>{props.children}</View>;
  MockMapView.Marker = (props: any) => <View testID="map-marker" {...props}>{props.children}</View>;
  MockMapView.PROVIDER_GOOGLE = 'google';
  return {
    __esModule: true,
    default: MockMapView,
    Marker: MockMapView.Marker,
    PROVIDER_GOOGLE: 'google',
  };
});

import {
  ExploreMapCanvas,
  INITIAL_EXPLORE_REGION,
  type ExploreMapRegion,
} from '../src/features/explore/components/ExploreMapCanvas';

describe('ExploreMapCanvas real native wiring', () => {
  const mockPlace = {
    id: 'p1',
    googlePlaceId: 'g1',
    name: 'Real Place',
    category: 'attractions' as const,
    categoryLabel: 'Attraction',
    iconName: 'attractions' as const,
    coordinate: { latitude: 1, longitude: 1 },
  };
  const otherPlace = {
    ...mockPlace,
    id: 'p2',
    googlePlaceId: 'g2',
    name: 'Cluster Child',
    coordinate: { latitude: 1.0005, longitude: 1.0005 },
  };
  const cluster = {
    type: 'cluster' as const,
    id: 'cluster-1',
    count: 2,
    coordinate: { latitude: 5, longitude: 5 },
    places: [mockPlace, otherPlace],
  };

  function flattenStyle(style: unknown) {
    return StyleSheet.flatten(style as any);
  }

  function isHostView(node: TestRenderer.ReactTestInstance) {
    return typeof node.type === 'string' && node.type === 'View';
  }

  function findMarkerByCoordinate(renderer: TestRenderer.ReactTestRenderer, coordinate: { latitude: number; longitude: number }) {
    return renderer.root.find(
      (node: TestRenderer.ReactTestInstance) =>
        isHostView(node) &&
        node.props.testID === 'map-marker' &&
        node.props.coordinate?.latitude === coordinate.latitude &&
        node.props.coordinate?.longitude === coordinate.longitude
    );
  }

  it('1. uses onRegionChange for zoom/pan movement start without churning repeated true updates, then settles onRegionChangeComplete', () => {
    const onMovementStateChange = jest.fn();
    const onRegionChangeComplete = jest.fn();
    const zoomRegion: ExploreMapRegion = {
      latitude: 2,
      longitude: 2,
      latitudeDelta: 0.08,
      longitudeDelta: 0.08,
    };

    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <ExploreMapCanvas
          markerItems={[]}
          markersDimmed={false}
          onDismissSelection={jest.fn()}
          onMovementStateChange={onMovementStateChange}
          onRegionChangeComplete={onRegionChangeComplete}
          onSelectPlace={jest.fn()}
          selectedPlaceId={null}
          status="ready"
        />
      );
    });

    const map = renderer.root.findByProps({ testID: 'map-view' });

    act(() => {
      map.props.onRegionChange(zoomRegion);
      map.props.onPanDrag();
    });
    expect(onMovementStateChange).toHaveBeenCalledTimes(1);
    expect(onMovementStateChange).toHaveBeenCalledWith(true);

    act(() => {
      map.props.onRegionChangeComplete(zoomRegion, { isGesture: true });
    });
    expect(onMovementStateChange).toHaveBeenLastCalledWith(false);
    expect(onRegionChangeComplete).toHaveBeenCalledWith(zoomRegion, { isGesture: true });

    act(() => {
      map.props.onRegionChange(INITIAL_EXPLORE_REGION);
    });
    expect(onMovementStateChange).toHaveBeenCalledTimes(3);
    expect(onMovementStateChange).toHaveBeenLastCalledWith(true);
  });

  it('2. renders hint markers as presentation-only native markers with hidden accessibility and tracksViewChanges disabled', () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <ExploreMapCanvas
          markerItems={[]}
          markersDimmed={false}
          onDismissSelection={jest.fn()}
          onMovementStateChange={jest.fn()}
          onSelectPlace={jest.fn()}
          selectedPlaceId={null}
          status="moving"
        />
      );
    });

    const hintMarkers = renderer.root.findAll(
      (node: TestRenderer.ReactTestInstance) =>
        isHostView(node) &&
        node.props.testID === 'map-marker' &&
        node.props.accessible === false
    );

    expect(hintMarkers).toHaveLength(8);
    hintMarkers.forEach((marker: TestRenderer.ReactTestInstance) => {
      expect(marker.props.onPress).toBeUndefined();
      expect(marker.props.accessible).toBe(false);
      expect(marker.props.accessibilityElementsHidden).toBe(true);
      expect(marker.props.importantForAccessibility).toBe('no-hide-descendants');
      expect(marker.props.tracksViewChanges).toBe(false);
    });
  });

  it('3. keeps a fresh place marker interactive at the native marker boundary and without dimmed opacity', () => {
    const onSelectPlace = jest.fn();
    let renderer!: TestRenderer.ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <ExploreMapCanvas
          markerItems={[{ id: 'm1', place: mockPlace, type: 'place' as const }]}
          markersDimmed={false}
          onDismissSelection={jest.fn()}
          onMovementStateChange={jest.fn()}
          onSelectPlace={onSelectPlace}
          selectedPlaceId={null}
          status="ready"
        />
      );
    });

    const marker = findMarkerByCoordinate(renderer, mockPlace.coordinate);
    expect(typeof marker.props.onPress).toBe('function');

    act(() => {
      marker.props.onPress();
    });
    expect(onSelectPlace).toHaveBeenCalledTimes(1);

    const pressable = renderer.root.findByProps({ accessibilityLabel: 'Real Place' });
    expect(pressable.props.disabled).toBe(false);
    expect(flattenStyle(pressable.props.style)?.opacity).toBeUndefined();
  });

  it('4. disables stale place markers at the native marker boundary and visibly dims the rendered pin wrapper', () => {
    const onSelectPlace = jest.fn();
    let renderer!: TestRenderer.ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <ExploreMapCanvas
          markerItems={[{ id: 'm1', place: mockPlace, type: 'place' as const }]}
          markersDimmed
          onDismissSelection={jest.fn()}
          onMovementStateChange={jest.fn()}
          onSelectPlace={onSelectPlace}
          selectedPlaceId={null}
          status="refreshing"
        />
      );
    });

    const marker = findMarkerByCoordinate(renderer, mockPlace.coordinate);
    expect(marker.props.onPress).toBeUndefined();

    const pressable = renderer.root.findByProps({ accessibilityLabel: 'Real Place' });
    expect(pressable.props.disabled).toBe(true);
    expect(pressable.props.onPress).toBeUndefined();
    expect(flattenStyle(pressable.props.style)?.opacity).toBe(0.45);
    expect(onSelectPlace).toHaveBeenCalledTimes(0);
  });

  it('5. disables stale clusters at the native marker boundary and visibly dims the cluster presentation', () => {
    const onSelectCluster = jest.fn();
    let renderer!: TestRenderer.ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <ExploreMapCanvas
          markerItems={[cluster]}
          markersDimmed
          onDismissSelection={jest.fn()}
          onMovementStateChange={jest.fn()}
          onSelectCluster={onSelectCluster}
          onSelectPlace={jest.fn()}
          selectedPlaceId={null}
          status="refreshing"
        />
      );
    });

    const marker = findMarkerByCoordinate(renderer, cluster.coordinate);
    expect(marker.props.onPress).toBeUndefined();

    const clusterCircle = renderer.root.find(
      (node: TestRenderer.ReactTestInstance) =>
        isHostView(node) &&
        flattenStyle(node.props.style)?.opacity === 0.45 &&
        node.findAll((child: TestRenderer.ReactTestInstance) => child.type === 'Text' && child.props.children === 2).length > 0
    );
    expect(flattenStyle(clusterCircle.props.style)?.opacity).toBe(0.45);
    expect(onSelectCluster).toHaveBeenCalledTimes(0);
  });
});
