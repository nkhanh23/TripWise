import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { memo, useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTranslation } from "../../../i18n";
import type {
  MainTabParamList,
  RootStackParamList,
} from "../../../navigation/types";
import { useTheme } from "../../../theme";
import { radius, spacing, typography } from "../../../theme/tokens";
import { useAuth } from "../../auth/AuthProvider";
import { ProfileDestructiveDialog } from "../components/ProfileDestructiveDialog";
import { ProfileHeader } from "../components/ProfileHeader";
import { ProfileMenuSection } from "../components/ProfileMenuSection";
import { useProfile } from "../hooks/useProfile";
import type { DestructiveActionType, ProfileMenuSectionData } from "../types";

type CombinedNavProp = NativeStackNavigationProp<RootStackParamList> &
  BottomTabNavigationProp<MainTabParamList>;
type Props = { onNavigateSettings?: () => void };

export const ProfileScreen = memo(function ProfileScreen({
  onNavigateSettings,
}: Props) {
  const navigation = useNavigation<CombinedNavProp>();
  const insets = useSafeAreaInsets();
  const { colors, effectiveTheme } = useTheme();
  const { t } = useTranslation();
  const { signOut, deleteAccount } = useAuth();
  const {
    profile,
    profileStatus,
    refreshProfile,
    tripsCount,
    savedCount,
    countriesCount,
  } = useProfile();
  const [activeAction, setActiveAction] = useState<DestructiveActionType>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleEditPress = useCallback(
    () => navigation.navigate("EditProfile"),
    [navigation],
  );
  const handleNavigateTrips = useCallback(
    () => navigation.navigate("Trips"),
    [navigation],
  );
  const handleNavigateSaved = useCallback(
    () => navigation.navigate("Saved"),
    [navigation],
  );
  const handleNavigateExplore = useCallback(
    () => navigation.navigate("Explore"),
    [navigation],
  );
  const handleOpenSettings = useCallback(() => {
    if (onNavigateSettings) onNavigateSettings();
    else navigation.navigate("Settings");
  }, [navigation, onNavigateSettings]);
  const handleOpenHelpSupport = useCallback(
    () => navigation.navigate("HelpSupport"),
    [navigation],
  );
  const handleUnavailableAction = useCallback(() => {
    Alert.alert(t("common.unavailableTitle"), t("common.unavailableMessage"));
  }, [t]);

  const handleConfirmAction = useCallback(async () => {
    if (activeAction === "deleteAccount") {
      if (signingOut) return;
      setSigningOut(true);
      setActionError(null);
      try {
        await deleteAccount();
        setActiveAction(null);
      } catch {
        setActionError(t("profile.signOutError"));
      } finally {
        setSigningOut(false);
      }
      return;
    }
    if (activeAction !== "signOut" || signingOut) return;
    setSigningOut(true);
    setActionError(null);
    try {
      await signOut();
      setActiveAction(null);
    } catch {
      setActionError(t("profile.signOutError"));
    } finally {
      setSigningOut(false);
    }
  }, [activeAction, deleteAccount, signOut, signingOut, t]);

  const menuSections = useMemo<ProfileMenuSectionData[]>(
    () => [
      {
        title: t("profile.sections.travel"),
        items: [
          {
            id: "my_trips",
            label: t("profile.menu.myTrips"),
            iconName: "flight",
            onPress: handleNavigateTrips,
          },
          {
            id: "saved_places",
            label: t("profile.menu.savedPlaces"),
            iconName: "bookmark",
            onPress: handleNavigateSaved,
          },
        ],
      },
      {
        title: t("profile.sections.account"),
        items: [
          {
            id: "personal_info",
            label: t("profile.menu.personalInfo"),
            iconName: "badge",
            onPress: handleEditPress,
          },
          {
            id: "settings",
            label: t("profile.menu.settings"),
            iconName: "settings",
            onPress: handleOpenSettings,
          },
        ],
      },
      {
        title: t("profile.sections.support"),
        items: [
          {
            id: "help_support",
            label: t("profile.menu.helpSupport"),
            iconName: "help",
            onPress: handleOpenHelpSupport,
          },
          {
            id: "about",
            label: t("profile.menu.about"),
            iconName: "info",
            disabled: true,
            onPress: handleUnavailableAction,
          },
          {
            id: "delete_account",
            label: t("profile.menu.deleteAccount"),
            iconName: "delete",
            isDestructive: true,
            onPress: () => setActiveAction("deleteAccount"),
          },
        ],
      },
    ],
    [
      handleEditPress,
      handleNavigateSaved,
      handleNavigateTrips,
      handleOpenHelpSupport,
      handleOpenSettings,
      handleUnavailableAction,
      t,
    ],
  );

  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: colors.background.canvas, paddingTop: insets.top },
      ]}
    >
      <View
        style={[
          styles.topBar,
          {
            backgroundColor:
              effectiveTheme === "dark"
                ? "rgba(19, 20, 24, 0.95)"
                : "rgba(252, 249, 248, 0.95)",
            borderBottomColor: colors.border.subtle,
          },
        ]}
      >
        <View style={styles.placeholderIcon} />
        <Text style={[styles.brandText, { color: colors.brand.primary }]}>
          TripWise
        </Text>
        <Pressable
          accessibilityHint="Explore places"
          accessibilityLabel="Search"
          accessibilityRole="button"
          hitSlop={8}
          onPress={handleNavigateExplore}
          style={({ pressed }) => [
            styles.iconButton,
            pressed && styles.pressed,
          ]}
        >
          <MaterialIcons color={colors.brand.primary} name="search" size={22} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing.xxxl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleContainer}>
          <Text style={[styles.pageTitle, { color: colors.text.primary }]}>
            {t("profile.title")}
          </Text>
        </View>

        {profileStatus === "loading" ? (
          <View style={styles.profileState}>
            <ActivityIndicator color={colors.brand.primary} />
            <Text
              style={[
                styles.profileStateText,
                { color: colors.text.secondary },
              ]}
            >
              {t("profile.loading")}
            </Text>
          </View>
        ) : null}

        {profileStatus === "error" || profileStatus === "absent" ? (
          <View accessibilityRole="alert" style={styles.profileState}>
            <Text
              style={[
                styles.profileStateText,
                { color: colors.text.secondary },
              ]}
            >
              {t(
                profileStatus === "error"
                  ? "profile.loadError"
                  : "profile.absent",
              )}
            </Text>
            <Pressable
              accessibilityLabel={t("profile.retry")}
              accessibilityRole="button"
              onPress={() => void refreshProfile()}
            >
              <Text style={{ color: colors.brand.primary }}>
                {t("profile.retry")}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {actionError ? (
          <Text
            accessibilityRole="alert"
            style={[styles.actionError, { color: colors.state.error }]}
          >
            {actionError}
          </Text>
        ) : null}

        {profile ? (
          <ProfileHeader
            countriesCount={countriesCount}
            onEditPress={handleEditPress}
            profile={profile}
            savedCount={savedCount}
            tripsCount={tripsCount}
          />
        ) : null}

        {menuSections.map((section) => (
          <ProfileMenuSection
            items={section.items}
            key={section.title}
            title={section.title}
          />
        ))}

        <View style={styles.signOutSection}>
          <Pressable
            accessibilityLabel={t("profile.menu.signOut")}
            accessibilityRole="button"
            onPress={() => {
              setActionError(null);
              setActiveAction("signOut");
            }}
            style={({ pressed }) => [
              styles.signOutButton,
              pressed && styles.pressed,
            ]}
          >
            <MaterialIcons color={colors.state.error} name="logout" size={20} />
            <Text style={[styles.signOutText, { color: colors.state.error }]}>
              {t("profile.menu.signOut")}
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      <ProfileDestructiveDialog
        actionType={activeAction}
        onCancel={() => {
          if (!signingOut) setActiveAction(null);
        }}
        onConfirm={() => void handleConfirmAction()}
        submitting={signingOut}
        visible={activeAction !== null}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topBar: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    height: 56,
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
  },
  iconButton: {
    alignItems: "center",
    borderRadius: radius.pill,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  placeholderIcon: { height: 38, width: 38 },
  brandText: {
    fontSize: typography.body,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 0.5,
  },
  scrollContent: { paddingBottom: spacing.xxxl },
  titleContainer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  pageTitle: {
    fontSize: typography.title,
    fontWeight: typography.fontWeight.bold,
  },
  profileState: {
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  profileStateText: { fontSize: typography.bodySmall, textAlign: "center" },
  actionError: {
    fontSize: typography.bodySmall,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    textAlign: "center",
  },
  signOutSection: {
    alignItems: "center",
    marginTop: spacing.xxl,
    paddingBottom: spacing.lg,
  },
  signOutButton: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  signOutText: {
    fontSize: typography.body,
    fontWeight: typography.fontWeight.bold,
  },
  pressed: { opacity: 0.7 },
});
