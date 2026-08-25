import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "../../../components/AppText";
import { useTranslation } from "../../../i18n";
import type { RootStackParamList } from "../../../navigation/types";
import { useTheme } from "../../../theme";
import { radius, spacing, typography } from "../../../theme/tokens";
import { CreateTripSuccessView } from "../components/CreateTripSuccessView";
import { StepBudgetGroup } from "../components/StepBudgetGroup";
import { StepDates } from "../components/StepDates";
import { StepDestination } from "../components/StepDestination";
import { StepPreferences } from "../components/StepPreferences";
import { StepSummary } from "../components/StepSummary";
import { WizardProgressBar } from "../components/WizardProgressBar";
import { useTripGeneration } from "../generation";
import { useTripPersistence } from "../persistence";
import {
  initialWizardState,
  mockPopularDestinations,
} from "../data/mockWizardData";
import type {
  BudgetTier,
  CreateTripWizardState,
  DestinationOption,
  GroupType,
  TravelPace,
  WizardStepNumber,
} from "../types";
import type { TripGenerationRepository } from "../../../integration/repositories";

type Props = {
  initialStep?: WizardStepNumber;
  initialState?: Partial<CreateTripWizardState>;
  onComplete?: (state: CreateTripWizardState) => void;
  onCancel?: () => void;
  generationRepository?: TripGenerationRepository;
};

export function CreateTripWizardScreen({
  initialStep = 1,
  initialState,
  onComplete,
  onCancel,
  generationRepository,
}: Props) {
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors, effectiveTheme } = useTheme();
  const { t } = useTranslation();

  const [currentStep, setCurrentStep] = useState<WizardStepNumber>(initialStep);
  const [stepError, setStepError] = useState<string | null>(null);
  const {
    state: generation,
    generate,
    retry,
  } = useTripGeneration(generationRepository);
  const { state: persistence, save } = useTripPersistence();
  const completedPreviewRef = useRef(false);

  const [wizardState, setWizardState] = useState<CreateTripWizardState>(() => ({
    ...initialWizardState,
    ...initialState,
  }));

  useEffect(() => {
    if (generation.status === "success" && !completedPreviewRef.current) {
      completedPreviewRef.current = true;
      onComplete?.(wizardState);
    }
  }, [generation.status, onComplete, wizardState]);

  // Step 1 handlers: Destination
  const handleSelectDestination = useCallback((dest: DestinationOption) => {
    setWizardState((prev) => ({
      ...prev,
      destination: dest,
      customDestinationName: dest.name,
      tripTitle: `${dest.name} Exploration 2026`,
    }));
    setStepError(null);
  }, []);

  const handleChangeCustomName = useCallback((name: string) => {
    setWizardState((prev) => {
      const match = mockPopularDestinations.find(
        (d) => d.name.toLowerCase() === name.trim().toLowerCase(),
      );
      return {
        ...prev,
        customDestinationName: name,
        destination: match || null,
        tripTitle: `${name || "Trip"} Adventure`,
      };
    });
    setStepError(null);
  }, []);

  // Step 2 handlers: Dates
  const handleChangeStartDate = useCallback((date: string) => {
    setWizardState((prev) => ({ ...prev, startDate: date }));
    setStepError(null);
  }, []);

  const handleChangeEndDate = useCallback((date: string) => {
    setWizardState((prev) => ({ ...prev, endDate: date }));
    setStepError(null);
  }, []);

  const handleSelectQuickDuration = useCallback((days: number) => {
    const start = new Date();
    start.setDate(start.getDate() + 14); // 2 weeks ahead default
    const end = new Date(start);
    end.setDate(end.getDate() + days - 1);

    const startStr = start.toISOString().split("T")[0];
    const endStr = end.toISOString().split("T")[0];

    setWizardState((prev) => ({
      ...prev,
      startDate: startStr,
      endDate: endStr,
      durationDays: days,
    }));
    setStepError(null);
  }, []);

  // Step 3 handlers: Preferences
  const handleToggleStyle = useCallback((styleId: string) => {
    setWizardState((prev) => {
      const exists = prev.selectedStyles.includes(styleId);
      const updated = exists
        ? prev.selectedStyles.filter((id) => id !== styleId)
        : [...prev.selectedStyles, styleId];
      return { ...prev, selectedStyles: updated };
    });
    setStepError(null);
  }, []);

  const handleSelectPace = useCallback((pace: TravelPace) => {
    setWizardState((prev) => ({ ...prev, pace }));
  }, []);

  // Step 4 handlers: Budget & Group
  const handleSelectBudget = useCallback((budget: BudgetTier) => {
    setWizardState((prev) => ({ ...prev, budget }));
  }, []);

  const handleSelectGroup = useCallback((groupType: GroupType) => {
    setWizardState((prev) => ({ ...prev, groupType }));
  }, []);

  // Step 5 handlers: Summary
  const handleChangeTitle = useCallback((title: string) => {
    setWizardState((prev) => ({ ...prev, tripTitle: title }));
  }, []);

  // Navigation handlers
  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as WizardStepNumber);
      setStepError(null);
    } else if (onCancel) {
      onCancel();
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [currentStep, navigation, onCancel]);

  const handleNext = useCallback(() => {
    // Validation rules per step
    if (currentStep === 1) {
      if (
        !wizardState.destination &&
        !wizardState.customDestinationName.trim()
      ) {
        setStepError(t("planner.validation.destinationRequired"));
        return;
      }
    } else if (currentStep === 2) {
      if (!wizardState.startDate || !wizardState.endDate) {
        setStepError(t("planner.validation.datesRequired"));
        return;
      }
      if (wizardState.durationDays < 1) {
        setStepError(t("planner.validation.durationMin"));
        return;
      }
    } else if (currentStep === 3) {
      if (wizardState.selectedStyles.length === 0) {
        setStepError(t("planner.validation.preferencesRequired"));
        return;
      }
    }

    setStepError(null);

    if (currentStep < 5) {
      setCurrentStep((prev) => (prev + 1) as WizardStepNumber);
    } else {
      completedPreviewRef.current = false;
      void generate(wizardState);
    }
  }, [currentStep, generate, wizardState, t]);

  const handleViewItinerary = useCallback(() => {
    navigation.navigate("MainTabs");
  }, [navigation]);

  const handleExplorePlaces = useCallback(() => {
    navigation.navigate("MainTabs");
  }, [navigation]);

  const handleSaveTrip = useCallback(() => {
    if (generation.status !== "success") return;
    void save(generation.preview, wizardState.tripTitle).then((tripId) => {
      if (tripId) navigation.navigate("TripDetail", { tripId });
    });
  }, [generation, navigation, save, wizardState.tripTitle]);

  // Render Step Content
  const stepContent = useMemo(() => {
    switch (currentStep) {
      case 1:
        return (
          <StepDestination
            customDestinationName={wizardState.customDestinationName}
            error={stepError}
            onChangeCustomName={handleChangeCustomName}
            onSelectDestination={handleSelectDestination}
            selectedDestination={wizardState.destination}
          />
        );
      case 2:
        return (
          <StepDates
            durationDays={wizardState.durationDays}
            endDate={wizardState.endDate}
            error={stepError}
            onChangeEndDate={handleChangeEndDate}
            onChangeStartDate={handleChangeStartDate}
            onSelectQuickDuration={handleSelectQuickDuration}
            startDate={wizardState.startDate}
          />
        );
      case 3:
        return (
          <StepPreferences
            error={stepError}
            onSelectPace={handleSelectPace}
            onToggleStyle={handleToggleStyle}
            selectedPace={wizardState.pace}
            selectedStyles={wizardState.selectedStyles}
          />
        );
      case 4:
        return (
          <StepBudgetGroup
            onSelectBudget={handleSelectBudget}
            onSelectGroup={handleSelectGroup}
            selectedBudget={wizardState.budget}
            selectedGroup={wizardState.groupType}
          />
        );
      case 5:
      default:
        return (
          <StepSummary onChangeTitle={handleChangeTitle} state={wizardState} />
        );
    }
  }, [
    currentStep,
    handleChangeCustomName,
    handleChangeEndDate,
    handleChangeStartDate,
    handleChangeTitle,
    handleSelectBudget,
    handleSelectDestination,
    handleSelectGroup,
    handleSelectPace,
    handleSelectQuickDuration,
    handleToggleStyle,
    stepError,
    wizardState,
  ]);

  // Success celebration screen
  if (generation.status === "success") {
    return (
      <View
        style={[
          styles.screen,
          {
            backgroundColor: colors.background.surface,
            paddingTop: insets.top,
          },
        ]}
      >
        <CreateTripSuccessView
          onExplorePlaces={handleExplorePlaces}
          onSave={handleSaveTrip}
          saveStatus={persistence.status}
          onViewItinerary={handleViewItinerary}
          preview={generation.preview}
          state={wizardState}
        />
      </View>
    );
  }

  // Simulated AI Generation Loading State
  if (generation.status === "generating") {
    return (
      <View
        accessibilityLabel={t("planner.generating")}
        accessibilityRole="progressbar"
        style={[
          styles.generatingContainer,
          { backgroundColor: colors.background.surface },
        ]}
      >
        <View
          style={[
            styles.generatingCircle,
            {
              backgroundColor:
                effectiveTheme === "dark" ? "#1E3A5F" : "#D8E2FF",
            },
          ]}
        >
          <MaterialIcons
            color={colors.brand.primary}
            name="auto-awesome"
            size={40}
          />
        </View>
        <ActivityIndicator color={colors.brand.primary} size="large" />
        <Text style={[styles.generatingTitle, { color: colors.text.primary }]}>
          {t("planner.generatingTitle", {
            destination:
              wizardState.destination?.name ||
              wizardState.customDestinationName ||
              "trip",
          })}
        </Text>
        <AppText style={styles.generatingSubtitle}>
          {t("planner.generatingSubtitle")}
        </AppText>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: colors.background.surface,
          paddingTop: Math.max(insets.top, spacing.xs),
        },
      ]}
    >
      {/* Top Progress & Header */}
      <WizardProgressBar
        currentStep={currentStep}
        onBack={handleBack}
        onCancel={onCancel}
        totalSteps={5}
      />

      {/* Main Step Body */}
      <View style={styles.body}>{stepContent}</View>

      {generation.status === "error" ? (
        <View
          accessibilityRole="alert"
          style={[
            styles.errorBanner,
            { backgroundColor: colors.background.surfaceVariant },
          ]}
        >
          <Text style={[styles.errorText, { color: colors.state.error }]}>
            {t(`planner.generationError.${generation.error.code}`)}
          </Text>
        </View>
      ) : null}

      {/* Fixed Bottom CTA Bar */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: colors.background.surface,
            borderTopColor: colors.border.default,
          },
        ]}
      >
        <Pressable
          accessibilityHint={
            currentStep === 5
              ? generation.status === "error"
                ? t("common.retry")
                : t("planner.generateItinerary")
              : t("common.continue")
          }
          accessibilityLabel={
            currentStep === 5
              ? generation.status === "error"
                ? t("common.retry")
                : t("planner.generateItinerary")
              : t("common.continue")
          }
          accessibilityRole="button"
          onPress={
            generation.status === "error" ? () => void retry() : handleNext
          }
          style={({ pressed }) => [
            styles.continueButton,
            { backgroundColor: colors.brand.primary },
            pressed && styles.pressed,
          ]}
        >
          <Text
            style={[styles.continueButtonText, { color: colors.text.inverse }]}
          >
            {currentStep === 5
              ? generation.status === "error"
                ? t("common.retry")
                : t("planner.generateItinerary")
              : t("common.continue")}
          </Text>
          <MaterialIcons
            color={colors.text.inverse}
            name={currentStep === 5 ? "auto-awesome" : "arrow-forward"}
            size={18}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  body: {
    flex: 1,
  },
  bottomBar: {
    borderTopWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  errorBanner: {
    borderRadius: radius.input,
    marginHorizontal: spacing.lg,
    padding: spacing.sm,
  },
  errorText: {
    fontSize: typography.bodySmall,
    textAlign: "center",
  },
  continueButton: {
    alignItems: "center",
    borderRadius: radius.pill,
    elevation: 3,
    flexDirection: "row",
    gap: spacing.xs,
    height: 48,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    width: "100%",
  },
  continueButtonText: {
    fontSize: typography.body,
    fontWeight: typography.fontWeight.bold,
  },
  generatingContainer: {
    alignItems: "center",
    flex: 1,
    gap: spacing.md,
    justifyContent: "center",
    padding: spacing.xxl,
  },
  generatingCircle: {
    alignItems: "center",
    borderRadius: radius.pill,
    height: 80,
    justifyContent: "center",
    marginBottom: spacing.xs,
    width: 80,
  },
  generatingTitle: {
    fontSize: typography.titleSmall,
    fontWeight: typography.fontWeight.bold,
    marginTop: spacing.xs,
    textAlign: "center",
  },
  generatingSubtitle: {
    fontSize: typography.bodySmall,
    lineHeight: 20,
    maxWidth: 280,
    textAlign: "center",
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
