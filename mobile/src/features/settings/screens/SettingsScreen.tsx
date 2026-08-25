import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { memo, useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '../../../i18n';
import type { RootStackParamList } from '../../../navigation/types';
import { useTheme } from '../../../theme';
import { radius, spacing, typography } from '../../../theme/tokens';
import { useAuth } from '../../auth/AuthProvider';
import { ProfileDestructiveDialog } from '../../profile/components/ProfileDestructiveDialog';
import type { DestructiveActionType } from '../../profile/types';
import { SettingsRow } from '../components/SettingsRow';
import { SettingsSection } from '../components/SettingsSection';
import { SettingsSwitchRow } from '../components/SettingsSwitchRow';
import { useSettings } from '../hooks/useSettings';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export const SettingsScreen = memo(function SettingsScreen({
  navigation,
}: Props) {
  const insets = useSafeAreaInsets();
  const { colors, effectiveTheme } = useTheme();
  const { t } = useTranslation();
  const { signOut, deleteAccount } = useAuth();

  const {
    themePreference,
    locale,
    currency,
    distanceUnit,
    setDistanceUnit,
    notifications,
    setNotifications,
  } = useSettings();

  const [activeDestructiveAction, setActiveDestructiveAction] =
    useState<DestructiveActionType>(null);

  // Derive display values
  const themeLabel =
    themePreference === 'system'
      ? t('settings.theme.system')
      : themePreference === 'light'
        ? t('settings.theme.light')
        : t('settings.theme.dark');

  const languageLabel =
    locale === 'vi'
      ? t('settings.language.vi')
      : t('settings.language.en');

  const distanceLabel =
    distanceUnit === 'km'
      ? t('settings.general.distanceKilometers')
      : t('settings.general.distanceMiles');

  const handleToggleDistance = useCallback(() => {
    setDistanceUnit(distanceUnit === 'km' ? 'mi' : 'km');
  }, [distanceUnit, setDistanceUnit]);

  const handleTripRemindersToggle = useCallback(
    (val: boolean) => {
      setNotifications({ tripReminders: val });
    },
    [setNotifications]
  );

  const handleItineraryRemindersToggle = useCallback(
    (val: boolean) => {
      setNotifications({ itineraryReminders: val });
    },
    [setNotifications]
  );

  const handleOpenDeleteAccountDialog = useCallback(() => {
    setActiveDestructiveAction('deleteAccount');
  }, []);

  const handleUnavailableAction = useCallback(() => {
    Alert.alert(t('common.unavailableTitle'), t('common.unavailableMessage'));
  }, [t]);

  const handleCloseDestructiveDialog = useCallback(() => {
    setActiveDestructiveAction(null);
  }, []);

  const handleConfirmDestructiveAction = useCallback(() => {
    const action = activeDestructiveAction;
    setActiveDestructiveAction(null);
    if (action === 'deleteAccount') {
      void deleteAccount();
    } else {
      void signOut();
    }
  }, [activeDestructiveAction, deleteAccount, signOut]);

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: colors.background.canvas,
          paddingTop: insets.top,
        },
      ]}>
      {/* Top App Bar */}
      <View
        style={[
          styles.topBar,
          {
            backgroundColor:
              effectiveTheme === 'dark'
                ? 'rgba(19, 20, 24, 0.95)'
                : 'rgba(252, 249, 248, 0.95)',
            borderBottomColor: colors.border.subtle,
          },
        ]}>
        <Pressable
          accessibilityHint="Go back to Profile"
          accessibilityLabel="Back"
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [
            styles.backButton,
            {
              backgroundColor:
                effectiveTheme === 'dark'
                  ? 'rgba(30, 31, 36, 0.9)'
                  : 'rgba(255, 255, 255, 0.9)',
            },
            pressed && styles.pressed,
          ]}>
          <MaterialIcons
            color={colors.brand.primary}
            name="arrow-back"
            size={22}
          />
        </Pressable>

        <Text style={[styles.title, { color: colors.text.primary }]}>
          {t('settings.title')}
        </Text>

        <View style={styles.spacer} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing.xxxl },
        ]}
        showsVerticalScrollIndicator={false}>
        {/* 1. GENERAL Section */}
        <SettingsSection title={t('settings.sections.general')}>
          <SettingsRow
            iconName="language"
            onPress={() => navigation.navigate('LanguageSettings')}
            title={t('settings.general.language')}
            value={languageLabel}
          />
          <SettingsRow
            iconName="payments"
            onPress={() => navigation.navigate('CurrencySettings')}
            title={t('settings.general.currency')}
            value={currency}
          />
          <SettingsRow
            iconName="straighten"
            onPress={handleToggleDistance}
            showDivider={false}
            title={t('settings.general.distance')}
            value={distanceLabel}
          />
        </SettingsSection>

        {/* 2. APPEARANCE Section */}
        <SettingsSection title={t('settings.sections.appearance')}>
          <SettingsRow
            iconName="palette"
            onPress={() => navigation.navigate('AppearanceSettings')}
            showDivider={false}
            title={t('settings.appearance.theme')}
            value={themeLabel}
          />
        </SettingsSection>

        {/* 3. NOTIFICATIONS Section */}
        <SettingsSection title={t('settings.sections.notifications')}>
          <SettingsSwitchRow
            description={t('settings.notifications.tripRemindersDesc')}
            iconName="notifications-active"
            onValueChange={handleTripRemindersToggle}
            title={t('settings.notifications.tripReminders')}
            value={notifications.tripReminders}
          />
          <SettingsSwitchRow
            description={t('settings.notifications.itineraryRemindersDesc')}
            iconName="event-note"
            onValueChange={handleItineraryRemindersToggle}
            showDivider={false}
            title={t('settings.notifications.itineraryReminders')}
            value={notifications.itineraryReminders}
          />
        </SettingsSection>

        {/* 4. ACCOUNT Section */}
        <SettingsSection title={t('settings.sections.account')}>
          <SettingsRow
            iconName="lock-reset"
            onPress={handleUnavailableAction}
            title={t('settings.account.changePassword')}
          />
          <SettingsRow
            iconName="security"
            onPress={() => navigation.navigate('HelpSupport')}
            title={t('settings.account.privacy')}
          />
          <SettingsRow
            iconName="delete-forever"
            isDestructive
            onPress={handleOpenDeleteAccountDialog}
            showChevron={false}
            showDivider={false}
            title={t('settings.account.deleteAccount')}
          />
        </SettingsSection>
      </ScrollView>

      {/* Destructive Confirmation Modal for Delete Account */}
      <ProfileDestructiveDialog
        actionType={activeDestructiveAction}
        onCancel={handleCloseDestructiveDialog}
        onConfirm={handleConfirmDestructiveAction}
        visible={activeDestructiveAction !== null}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  topBar: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    height: 56,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  backButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  title: {
    fontSize: typography.titleSmall,
    fontWeight: typography.fontWeight.bold,
  },
  spacer: {
    height: 38,
    width: 38,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  pressed: {
    opacity: 0.7,
  },
});
