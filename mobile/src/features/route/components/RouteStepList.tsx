import { memo, useCallback } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { spacing } from '../../../theme/tokens';
import type { RouteStep } from '../types';
import { RouteStepItem } from './RouteStepItem';

type Props = {
  steps: RouteStep[];
  headerComponent?: React.ReactElement | null;
  footerComponent?: React.ReactElement | null;
};

export const RouteStepList = memo(function RouteStepList({
  steps,
  headerComponent,
  footerComponent,
}: Props) {
  const keyExtractor = useCallback((item: RouteStep) => item.id, []);

  const renderItem = useCallback(
    ({ item, index }: { item: RouteStep; index: number }) => (
      <RouteStepItem isLast={index === steps.length - 1} step={item} />
    ),
    [steps.length]
  );

  return (
    <View style={styles.container}>
      <FlatList
        ListFooterComponent={footerComponent}
        ListHeaderComponent={headerComponent}
        contentContainerStyle={styles.listContent}
        data={steps}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 110,
    paddingHorizontal: spacing.lg,
  },
});
