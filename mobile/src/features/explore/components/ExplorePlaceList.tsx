import { memo, useCallback } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { spacing } from '../../../theme/tokens';
import type { ExploreMapPlace } from '../types';
import { ExplorePlaceListItem } from './ExplorePlaceListItem';

type Props = {
  places: ExploreMapPlace[];
  selectedPlaceId: string | null;
  onSelectPlace: (place: ExploreMapPlace) => void;
  topPadding: number;
};

export const ExplorePlaceList = memo(function ExplorePlaceList({
  places,
  selectedPlaceId,
  onSelectPlace,
  topPadding,
}: Props) {
  const keyExtractor = useCallback((item: ExploreMapPlace) => item.id, []);

  const renderItem = useCallback(
    ({ item }: { item: ExploreMapPlace }) => (
      <ExplorePlaceListItem
        isSelected={item.id === selectedPlaceId}
        onSelect={onSelectPlace}
        place={item}
      />
    ),
    [selectedPlaceId, onSelectPlace]
  );

  return (
    <View style={styles.container}>
      <FlatList
        contentContainerStyle={[styles.listContent, { paddingTop: topPadding + spacing.xs }]}
        data={places}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  listContent: {
    paddingBottom: 110,
  },
});
