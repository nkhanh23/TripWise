import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { memo } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '../../../i18n';
import { useTheme } from '../../../theme';
import { radius, spacing, typography } from '../../../theme/tokens';
import type { DestructiveActionType } from '../types';

type Props = {
  actionType: DestructiveActionType;
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  submitting?: boolean;
};

export const ProfileDestructiveDialog = memo(function ProfileDestructiveDialog({
  actionType,
  visible,
  onConfirm,
  onCancel,
  submitting = false,
}: Props) {
  const { colors, effectiveTheme } = useTheme();
  const { t } = useTranslation();

  if (!actionType || !visible) return null;

  const isDelete = actionType === 'deleteAccount';

  const title = isDelete
    ? t('profile.deleteConfirm.title')
    : t('profile.signOutConfirm.title');
  const description = isDelete
    ? t('profile.deleteConfirm.description')
    : t('profile.signOutConfirm.description');
  const confirmText = isDelete
    ? t('profile.deleteConfirm.confirm')
    : t('profile.signOutConfirm.confirm');
  const iconName = isDelete ? 'warning' : 'logout';

  return (
    <Modal
      animationType="fade"
      hardwareAccelerated
      onRequestClose={onCancel}
      transparent
      visible={visible}>
      {/* 1. Backdrop Overlay */}
      <Pressable
        accessibilityHint={t('common.close')}
        accessibilityLabel={t('common.close')}
        accessibilityRole="button"
        onPress={onCancel}
        style={styles.backdrop}>
        {/* 2. Dialog Bottom Sheet Card */}
        <Pressable
          accessibilityViewIsModal={true}
          onPress={(e) => e.stopPropagation?.()}
          style={[
            styles.dialogCard,
            {
              backgroundColor: colors.background.surface,
              borderColor: colors.border.default,
            },
          ]}>
          {/* Grabber Handle */}
          <View accessible={false} style={styles.grabberContainer}>
            <View
              style={[
                styles.grabber,
                { backgroundColor: colors.border.default },
              ]}
            />
          </View>

          {/* Warning / Logout Icon Header */}
          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor:
                  effectiveTheme === 'dark'
                    ? 'rgba(186, 26, 26, 0.25)'
                    : '#FFDAD6',
              },
            ]}>
            <MaterialIcons
              color={colors.state.error}
              name={iconName}
              size={24}
            />
          </View>

          {/* Text Information */}
          <Text
            accessibilityRole="header"
            style={[
              styles.titleText,
              { color: colors.text.primary },
            ]}>
            {title}
          </Text>
          <Text
            style={[
              styles.descriptionText,
              { color: colors.text.secondary },
            ]}>
            {description}
          </Text>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            {/* Destructive Confirm CTA */}
            <Pressable
              accessibilityHint={confirmText}
              accessibilityLabel={confirmText}
              accessibilityRole="button"
              disabled={submitting}
              onPress={onConfirm}
              style={({ pressed }) => [
                styles.confirmButton,
                { backgroundColor: colors.state.error },
                pressed && styles.pressed,
              ]}>
              {submitting ? <ActivityIndicator color={colors.text.inverse} size="small" /> : (
                <>
                  <MaterialIcons color={colors.text.inverse} name={iconName} size={18} />
                  <Text style={[styles.confirmButtonText, { color: colors.text.inverse }]}>{confirmText}</Text>
                </>
              )}
            </Pressable>

            {/* Cancel Button */}
            <Pressable
              accessibilityHint={t('common.cancel')}
              accessibilityLabel={t('common.cancel')}
              accessibilityRole="button"
              disabled={submitting}
              onPress={onCancel}
              style={({ pressed }) => [
                styles.cancelButton,
                {
                  backgroundColor:
                    effectiveTheme === 'dark'
                      ? colors.background.surfaceVariant
                      : colors.background.canvas,
                  borderColor: colors.border.default,
                },
                pressed && styles.pressed,
              ]}>
              <Text
                style={[
                  styles.cancelButtonText,
                  { color: colors.text.primary },
                ]}>
                {t('common.cancel')}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
});

const styles = StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  dialogCard: {
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    borderWidth: 1,
    elevation: 8,
    maxWidth: 480,
    paddingBottom: spacing.xxxl,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    width: '100%',
  },
  grabberContainer: {
    alignItems: 'center',
    marginBottom: spacing.md,
    width: '100%',
  },
  grabber: {
    borderRadius: radius.pill,
    height: 4,
    width: 40,
  },
  iconCircle: {
    alignItems: 'center',
    alignSelf: 'center',
    borderRadius: radius.pill,
    height: 48,
    justifyContent: 'center',
    marginBottom: spacing.md,
    width: 48,
  },
  titleText: {
    fontSize: typography.titleSmall,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  descriptionText: {
    fontSize: typography.body,
    lineHeight: 22,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  actionsContainer: {
    gap: spacing.md,
    width: '100%',
  },
  confirmButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    elevation: 2,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  confirmButtonText: {
    fontSize: typography.body,
    fontWeight: typography.fontWeight.bold,
  },
  cancelButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  cancelButtonText: {
    fontSize: typography.body,
    fontWeight: typography.fontWeight.semibold,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
