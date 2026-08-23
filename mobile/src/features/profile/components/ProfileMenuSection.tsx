import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../../theme';
import { radius, spacing, typography } from '../../../theme/tokens';
import type { ProfileMenuItem } from '../types';

type Props = {
  title: string;
  items: ProfileMenuItem[];
};

export const ProfileMenuSection = memo(function ProfileMenuSection({
  title,
  items,
}: Props) {
  const { colors, effectiveTheme } = useTheme();

  return (
    <View style={styles.container}>
      {/* Section Header Title */}
      <Text
        style={[
          styles.sectionTitle,
          { color: colors.text.secondary },
        ]}>
        {title.toUpperCase()}
      </Text>

      {/* Menu Card Group */}
      <View
        style={[
          styles.cardGroup,
          {
            backgroundColor: colors.background.surface,
            borderColor: colors.border.default,
          },
        ]}>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <View key={item.id}>
              <Pressable
                accessibilityHint={`Navigate to ${item.label}`}
                accessibilityLabel={item.label}
                accessibilityRole="button"
                onPress={item.onPress}
                style={({ pressed }) => [
                  styles.rowItem,
                  pressed && styles.pressed,
                ]}>
                {/* Leading Circular Icon Container */}
                <View
                  style={[
                    styles.iconCircle,
                    {
                      backgroundColor:
                        item.isDestructive
                          ? effectiveTheme === 'dark'
                            ? 'rgba(186, 26, 26, 0.2)'
                            : '#FFDAD6'
                          : effectiveTheme === 'dark'
                            ? 'rgba(216, 228, 242, 0.15)'
                            : '#D8E4F2',
                    },
                  ]}>
                  <MaterialIcons
                    color={
                      item.isDestructive
                        ? colors.state.error
                        : colors.brand.primary
                    }
                    name={item.iconName as any}
                    size={20}
                  />
                </View>

                {/* Row Label */}
                <Text
                  style={[
                    styles.itemLabel,
                    {
                      color: item.isDestructive
                        ? colors.state.error
                        : colors.text.primary,
                    },
                  ]}>
                  {item.label}
                </Text>

                {/* Trailing Chevron */}
                <MaterialIcons
                  color={colors.text.muted}
                  name="chevron-right"
                  size={22}
                />
              </Pressable>

              {/* Row Divider */}
              {!isLast ? (
                <View
                  style={[
                    styles.divider,
                    { backgroundColor: colors.border.subtle },
                  ]}
                />
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.bodySmall,
    fontWeight: typography.fontWeight.semibold,
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  cardGroup: {
    borderRadius: radius.card,
    borderWidth: 1,
    elevation: 2,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  rowItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  iconCircle: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  itemLabel: {
    flex: 1,
    fontSize: typography.body,
    fontWeight: typography.fontWeight.regular,
  },
  divider: {
    height: 1,
    marginLeft: 56 + spacing.md,
  },
  pressed: {
    opacity: 0.7,
  },
});
