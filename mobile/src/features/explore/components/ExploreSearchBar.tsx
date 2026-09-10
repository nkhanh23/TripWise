import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { useTranslation } from '../../../i18n';
import { useTheme } from '../../../theme';
import { radius, spacing, typography } from '../../../theme/tokens';

type Props = {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onClear: () => void;
};

export function ExploreSearchBar({ searchQuery, onSearchChange, onClear }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.searchPill,
          {
            backgroundColor: colors.background.surface,
            borderColor: colors.border.subtle,
          },
        ]}>
        <MaterialIcons
          color={colors.text.muted}
          name="search"
          size={20}
          style={styles.searchIcon}
        />
        <TextInput
          accessibilityHint={t('explore.searchHint')}
          accessibilityLabel={t('common.search')}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
          onChangeText={onSearchChange}
          placeholder={t('explore.searchPlaceholder')}
          placeholderTextColor={colors.text.muted}
          returnKeyType="search"
          style={[styles.input, { color: colors.text.primary }]}
          value={searchQuery}
        />
        {searchQuery.length > 0 ? (
          <Pressable
            accessibilityHint={t('explore.clearSearch')}
            accessibilityLabel={t('explore.clearSearch')}
            accessibilityRole="button"
            hitSlop={8}
            onPress={onClear}
            style={styles.clearButton}>
            <MaterialIcons color={colors.text.muted} name="close" size={16} />
          </Pressable>
        ) : null}
        <Pressable
          accessibilityHint={t('explore.filters')}
          accessibilityLabel={t('explore.filters')}
          accessibilityRole="button"
          hitSlop={8}
          style={[
            styles.filterButton,
            { backgroundColor: colors.background.surfaceVariant },
          ]}>
          <MaterialIcons color={colors.text.secondary} name="tune" size={18} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    width: '100%',
    zIndex: 20,
  },
  searchPill: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 0.5,
    elevation: 4,
    flexDirection: 'row',
    height: 50,
    paddingHorizontal: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: typography.body,
    height: '100%',
    paddingVertical: 0,
  },
  clearButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 44,
    justifyContent: 'center',
    marginRight: spacing.xs,
    width: 44,
  },
  filterButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 44,
    justifyContent: 'center',
    marginLeft: spacing.xs,
    width: 44,
  },
});
