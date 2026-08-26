import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../../../theme/tokens';
import type { ExploreMapPlace } from '../types';
import { mapCoordinateToFixturePercent } from '../utils/exploreMapUtils';

type Props = {
  place: ExploreMapPlace;
  isSelected: boolean;
  onPress: (place: ExploreMapPlace) => void;
};

export const ExploreMarker = memo(function ExploreMarker({ place, isSelected, onPress }: Props) {
  const position = 'fixtureMapCoordinate' in place
    ? place.fixtureMapCoordinate
    : mapCoordinateToFixturePercent(place.coordinate);
  return (
    <View
      style={[
        styles.container,
        {
          top: `${position.topPercent}%`,
          left: `${position.leftPercent}%`,
        },
        isSelected && styles.selectedZIndex,
      ]}>
      {/* Selected Name Badge */}
      {isSelected ? (
        <View style={styles.nameBadge}>
          <Text numberOfLines={1} style={styles.nameBadgeText}>
            {place.name}
          </Text>
        </View>
      ) : null}

      {/* Marker Pin Touch Target */}
      <Pressable
        accessibilityHint={`Xem chi tiết địa điểm ${place.name}`}
        accessibilityLabel={place.name}
        accessibilityRole="button"
        accessibilityState={{ selected: isSelected }}
        onPress={() => onPress(place)}
        style={({ pressed }) => [styles.touchTarget, pressed && styles.pressed]}>
        {/* Pin Outer Bubble */}
        <View style={[styles.pinOuter, isSelected ? styles.pinOuterSelected : styles.pinOuterDefault]}>
          {/* Inner Circle with Category Icon */}
          <View style={[styles.pinInner, isSelected ? styles.pinInnerSelected : styles.pinInnerDefault]}>
            <MaterialIcons color="#FFFFFF" name={place.iconName} size={14} />
          </View>
        </View>
        {/* Pin Arrow Point */}
        <View style={[styles.pinPoint, isSelected ? styles.pinPointSelected : styles.pinPointDefault]} />
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    position: 'absolute',
    transform: [{ translateX: -20 }, { translateY: -40 }],
    zIndex: 10,
  },
  selectedZIndex: {
    zIndex: 30,
  },
  nameBadge: {
    backgroundColor: colors.brand.primary,
    borderRadius: radius.input,
    elevation: 4,
    marginBottom: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  nameBadgeText: {
    color: colors.text.inverse,
    fontSize: 12,
    fontWeight: typography.fontWeight.semibold,
  },
  touchTarget: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  pinOuter: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.pill,
    elevation: 3,
    height: 34,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    width: 34,
  },
  pinOuterDefault: {
    borderColor: '#FFFFFF',
    borderWidth: 2,
  },
  pinOuterSelected: {
    borderColor: colors.brand.red,
    borderWidth: 2.5,
    transform: [{ scale: 1.15 }],
  },
  pinInner: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  pinInnerDefault: {
    backgroundColor: colors.brand.primary,
  },
  pinInnerSelected: {
    backgroundColor: colors.brand.red,
  },
  pinPoint: {
    borderLeftColor: 'transparent',
    borderLeftWidth: 5,
    borderRightColor: 'transparent',
    borderRightWidth: 5,
    borderTopWidth: 6,
    height: 0,
    marginTop: -2,
    width: 0,
  },
  pinPointDefault: {
    borderTopColor: '#FFFFFF',
  },
  pinPointSelected: {
    borderTopColor: colors.brand.red,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
});
