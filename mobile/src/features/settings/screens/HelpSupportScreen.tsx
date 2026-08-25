import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { memo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '../../../i18n';
import type { RootStackParamList } from '../../../navigation/types';
import { useTheme } from '../../../theme';
import { radius, spacing, typography } from '../../../theme/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'HelpSupport'>;

type HelpTopic = {
  id: string;
  titleKey: string;
  defaultTitle: string;
  iconName: 'help-outline' | 'headset-mic' | 'report-problem';
};

const COMMON_TOPICS: HelpTopic[] = [
  {
    id: 'faq',
    titleKey: 'helpSupport.topics.faq',
    defaultTitle: 'Frequently asked questions',
    iconName: 'help-outline',
  },
  {
    id: 'contact',
    titleKey: 'helpSupport.topics.contact',
    defaultTitle: 'Contact support',
    iconName: 'headset-mic',
  },
  {
    id: 'report',
    titleKey: 'helpSupport.topics.report',
    defaultTitle: 'Report a problem',
    iconName: 'report-problem',
  },
];

type LegalItem = {
  id: string;
  titleKey: string;
  defaultTitle: string;
  iconName: 'privacy-tip' | 'description';
};

const LEGAL_ITEMS: LegalItem[] = [
  {
    id: 'privacy',
    titleKey: 'helpSupport.legal.privacyPolicy',
    defaultTitle: 'Privacy Policy',
    iconName: 'privacy-tip',
  },
  {
    id: 'terms',
    titleKey: 'helpSupport.legal.termsOfService',
    defaultTitle: 'Terms of Service',
    iconName: 'description',
  },
];

export const HelpSupportScreen = memo(function HelpSupportScreen({
  navigation,
}: Props) {
  const insets = useSafeAreaInsets();
  const { colors, effectiveTheme } = useTheme();
  const { t } = useTranslation();

  const [searchQuery, setSearchQuery] = useState('');
  const handleUnavailableAction = () => {
    Alert.alert(t('common.unavailableTitle'), t('common.unavailableMessage'));
  };

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
          accessibilityHint="Go back"
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
          {t('helpSupport.title')}
        </Text>

        <View style={styles.spacer} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing.xxxl },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {/* Search Bar */}
        <View
          style={[
            styles.searchContainer,
            {
              backgroundColor:
                effectiveTheme === 'dark'
                  ? 'rgba(255, 255, 255, 0.06)'
                  : colors.background.surfaceVariant,
            },
          ]}>
          <MaterialIcons
            color={colors.icon.muted}
            name="search"
            size={20}
            style={styles.searchIcon}
          />
          <TextInput
            accessibilityLabel={t('helpSupport.searchPlaceholder')}
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setSearchQuery}
            placeholder={t('helpSupport.searchPlaceholder')}
            placeholderTextColor={colors.text.muted}
            style={[styles.searchInput, { color: colors.text.primary }]}
            value={searchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable
              accessibilityLabel="Clear search"
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => setSearchQuery('')}>
              <MaterialIcons
                color={colors.icon.muted}
                name="cancel"
                size={18}
              />
            </Pressable>
          )}
        </View>

        {/* Common Topics Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.brand.primary }]}>
            {t('helpSupport.sections.commonTopics')}
          </Text>

          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.background.surface,
                borderColor: colors.border.subtle,
              },
            ]}>
            {COMMON_TOPICS.map((topic, index) => {
              const isLast = index === COMMON_TOPICS.length - 1;

              return (
                <View key={topic.id}>
                  <Pressable
                    accessibilityHint={`View ${t(topic.titleKey)}`}
                    accessibilityLabel={t(topic.titleKey)}
                    accessibilityRole="button"
                    onPress={handleUnavailableAction}
                    style={({ pressed }) => [
                      styles.row,
                      pressed && styles.pressed,
                    ]}>
                    <View style={styles.rowLeft}>
                      <MaterialIcons
                        color={colors.brand.primary}
                        name={topic.iconName}
                        size={20}
                      />
                      <Text
                        style={[
                          styles.rowTitle,
                          { color: colors.text.primary },
                        ]}>
                        {t(topic.titleKey)}
                      </Text>
                    </View>

                    <MaterialIcons
                      color={colors.icon.muted}
                      name="chevron-right"
                      size={20}
                    />
                  </Pressable>
                  {!isLast && (
                    <View
                      style={[
                        styles.divider,
                        { backgroundColor: colors.border.subtle },
                      ]}
                    />
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* Legal Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.brand.primary }]}>
            {t('helpSupport.sections.legal')}
          </Text>

          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.background.surface,
                borderColor: colors.border.subtle,
              },
            ]}>
            {LEGAL_ITEMS.map((item, index) => {
              const isLast = index === LEGAL_ITEMS.length - 1;

              return (
                <View key={item.id}>
                  <Pressable
                    accessibilityHint={`View ${t(item.titleKey)}`}
                    accessibilityLabel={t(item.titleKey)}
                    accessibilityRole="button"
                    onPress={handleUnavailableAction}
                    style={({ pressed }) => [
                      styles.row,
                      pressed && styles.pressed,
                    ]}>
                    <View style={styles.rowLeft}>
                      <MaterialIcons
                        color={colors.brand.primary}
                        name={item.iconName}
                        size={20}
                      />
                      <Text
                        style={[
                          styles.rowTitle,
                          { color: colors.text.primary },
                        ]}>
                        {t(item.titleKey)}
                      </Text>
                    </View>

                    <MaterialIcons
                      color={colors.icon.muted}
                      name="chevron-right"
                      size={20}
                    />
                  </Pressable>
                  {!isLast && (
                    <View
                      style={[
                        styles.divider,
                        { backgroundColor: colors.border.subtle },
                      ]}
                    />
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* Contextual Illustration (Support Agent) */}
        <View style={styles.illustrationContainer}>
          <View
            style={[
              styles.illustrationCircle,
              {
                borderColor: colors.border.default,
                backgroundColor:
                  effectiveTheme === 'dark'
                    ? 'rgba(255, 255, 255, 0.04)'
                    : colors.background.surfaceVariant,
              },
            ]}>
            <MaterialIcons
              color={colors.icon.muted}
              name="support-agent"
              size={48}
            />
          </View>
        </View>
      </ScrollView>
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
  searchContainer: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flexDirection: 'row',
    height: 48,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.body,
    height: '100%',
    padding: 0,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.bodySmall,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 1,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
    textTransform: 'uppercase',
  },
  card: {
    borderRadius: radius.card,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  rowLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  rowTitle: {
    fontSize: typography.body,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 52,
  },
  illustrationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
    opacity: 0.6,
    paddingVertical: spacing.xxl,
  },
  illustrationCircle: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderStyle: 'dashed',
    borderWidth: 2,
    height: 100,
    justifyContent: 'center',
    width: 100,
  },
  pressed: {
    opacity: 0.7,
  },
});
