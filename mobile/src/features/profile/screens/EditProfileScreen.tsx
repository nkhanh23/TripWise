import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { memo, useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { authErrorTranslationKey } from '../../auth/authErrors';
import { useTranslation } from '../../../i18n';
import type { RootStackParamList } from '../../../navigation/types';
import { useTheme } from '../../../theme';
import { radius, spacing, typography } from '../../../theme/tokens';
import { PROFILE_AVATAR_OPTIONS } from '../data/avatarOptions';
import { useProfile } from '../hooks/useProfile';

type Props = NativeStackScreenProps<RootStackParamList, 'EditProfile'>;

export const EditProfileScreen = memo(function EditProfileScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { colors, effectiveTheme } = useTheme();
  const { t } = useTranslation();
  const { profile, updateProfile } = useProfile();
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [homeCountry, setHomeCountry] = useState(profile?.homeCountry ?? '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatarUrl ?? null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleChangePhoto = useCallback(() => {
    const currentIndex = avatarUrl ? PROFILE_AVATAR_OPTIONS.indexOf(
      avatarUrl as (typeof PROFILE_AVATAR_OPTIONS)[number],
    ) : -1;
    setAvatarUrl(PROFILE_AVATAR_OPTIONS[(currentIndex + 1) % PROFILE_AVATAR_OPTIONS.length]);
  }, [avatarUrl]);

  const handleSave = useCallback(async () => {
    if (submitting) return;
    const normalizedName = displayName.trim();
    if (!normalizedName) {
      setValidationError(t('profile.edit.validationNameRequired'));
      return;
    }
    setSubmitting(true);
    setValidationError(null);
    setSaveError(null);
    try {
      await updateProfile({ displayName: normalizedName, homeCountry: homeCountry.trim(), avatarUrl });
      Alert.alert(t('common.success'), t('profile.edit.savedSuccess'), [
        { text: t('common.done'), onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      setSaveError(t(authErrorTranslationKey(error)));
    } finally {
      setSubmitting(false);
    }
  }, [avatarUrl, displayName, homeCountry, navigation, submitting, t, updateProfile]);

  if (!profile) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background.canvas }]}>
        <Text style={{ color: colors.text.secondary }}>{t('profile.absent')}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background.canvas, paddingTop: insets.top }]}>
      <View style={[
        styles.topBar,
        {
          backgroundColor: effectiveTheme === 'dark' ? 'rgba(19, 20, 24, 0.95)' : 'rgba(252, 249, 248, 0.95)',
          borderBottomColor: colors.border.subtle,
        },
      ]}>
        <Pressable
          accessibilityLabel={t('common.back')}
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
          <MaterialIcons color={colors.brand.primary} name="arrow-back" size={22} />
        </Pressable>
        <Text style={[styles.screenTitle, { color: colors.text.primary }]}>{t('profile.edit.title')}</Text>
        <View style={styles.placeholder} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardContainer}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing.xxxl }]}
          keyboardShouldPersistTaps="handled">
          <View style={styles.avatarSection}>
            {avatarUrl ? (
              <Image
                accessibilityLabel={displayName}
                accessibilityRole="image"
                source={{ uri: avatarUrl }}
                style={[styles.avatarImage, { borderColor: colors.brand.primaryContainer }]}
              />
            ) : (
              <View style={[
                styles.avatarImage, styles.avatarPlaceholder,
                { backgroundColor: colors.background.surfaceVariant, borderColor: colors.brand.primaryContainer },
              ]}>
                <MaterialIcons color={colors.brand.primary} name="person" size={48} />
              </View>
            )}
            <Pressable
              accessibilityLabel={t('profile.edit.changePhoto')}
              accessibilityRole="button"
              onPress={handleChangePhoto}
              style={({ pressed }) => [styles.changePhotoBtn, pressed && styles.pressed]}>
              <Text style={[styles.changePhotoText, { color: colors.brand.primary }]}>{t('profile.edit.changePhoto')}</Text>
            </Pressable>
          </View>

          <View style={[styles.formCard, { backgroundColor: colors.background.surface, borderColor: colors.border.default }]}>
            <ProfileField
              accessibilityLabel={t('profile.edit.fullName')}
              editable={!submitting}
              icon="person"
              label={t('profile.edit.fullName')}
              onChangeText={(text) => {
                setDisplayName(text);
                setValidationError(null);
              }}
              value={displayName}
            />
            {validationError ? <Text style={[styles.errorText, { color: colors.state.error }]}>{validationError}</Text> : null}

            <ProfileField
              accessibilityLabel={t('profile.edit.email')}
              editable={false}
              icon="mail"
              label={t('profile.edit.email')}
              value={profile.email}
            />
            <ProfileField
              accessibilityLabel={t('profile.edit.homeCountry')}
              editable={!submitting}
              icon="public"
              label={t('profile.edit.homeCountry')}
              maxLength={2}
              onChangeText={setHomeCountry}
              placeholder={t('profile.edit.homeCountryPlaceholder')}
              value={homeCountry}
            />
            {saveError ? <Text accessibilityRole="alert" style={[styles.errorText, { color: colors.state.error }]}>{saveError}</Text> : null}
          </View>

          <Pressable
            accessibilityLabel={t('profile.edit.saveChanges')}
            accessibilityRole="button"
            disabled={submitting}
            onPress={() => void handleSave()}
            style={({ pressed }) => [
              styles.saveButton,
              { backgroundColor: colors.brand.primary },
              submitting && styles.disabled,
              pressed && !submitting && styles.pressed,
            ]}>
            {submitting ? <ActivityIndicator color={colors.text.inverse} /> : (
              <Text style={[styles.saveButtonText, { color: colors.text.inverse }]}>{t('profile.edit.saveChanges')}</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
});

type ProfileFieldProps = {
  accessibilityLabel: string;
  editable: boolean;
  icon: 'person' | 'mail' | 'public';
  label: string;
  maxLength?: number;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  value: string;
};

function ProfileField({ accessibilityLabel, editable, icon, label, maxLength, onChangeText, placeholder, value }: ProfileFieldProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.fieldLabel, { color: colors.text.secondary }]}>{label}</Text>
      <View style={[styles.inputRow, { backgroundColor: colors.background.surfaceVariant, borderColor: colors.border.default }]}>
        <MaterialIcons color={colors.text.secondary} name={icon} size={20} />
        <TextInput
          accessibilityLabel={accessibilityLabel}
          editable={editable}
          maxLength={maxLength}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.text.muted}
          style={[styles.textInput, { color: editable ? colors.text.primary : colors.text.muted }]}
          value={value}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  topBar: {
    alignItems: 'center', borderBottomWidth: 1, flexDirection: 'row', height: 56,
    justifyContent: 'space-between', paddingHorizontal: spacing.lg,
  },
  iconButton: { alignItems: 'center', borderRadius: radius.pill, height: 38, justifyContent: 'center', width: 38 },
  screenTitle: { fontSize: typography.titleSmall, fontWeight: typography.fontWeight.bold },
  placeholder: { width: 38 },
  keyboardContainer: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl },
  avatarSection: { alignItems: 'center', marginBottom: spacing.xl },
  avatarImage: { borderRadius: 48, borderWidth: 4, height: 96, width: 96 },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  changePhotoBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  changePhotoText: { fontSize: typography.bodySmall, fontWeight: typography.fontWeight.semibold },
  formCard: { borderRadius: radius.card, borderWidth: 1, gap: spacing.md, padding: spacing.xl },
  fieldGroup: { gap: spacing.xs },
  fieldLabel: { fontSize: typography.bodySmall, fontWeight: typography.fontWeight.semibold },
  inputRow: {
    alignItems: 'center', borderRadius: radius.input, borderWidth: 1, flexDirection: 'row',
    gap: spacing.sm, minHeight: 48, paddingHorizontal: spacing.md,
  },
  textInput: { flex: 1, fontSize: typography.body, paddingVertical: spacing.sm },
  noticeText: { fontSize: typography.bodySmall, lineHeight: 18 },
  errorText: { fontSize: typography.bodySmall },
  saveButton: {
    alignItems: 'center', borderRadius: radius.pill, justifyContent: 'center',
    marginTop: spacing.xxl, minHeight: 50, paddingHorizontal: spacing.xl,
  },
  saveButtonText: { fontSize: typography.body, fontWeight: typography.fontWeight.bold },
  disabled: { opacity: 0.6 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});
