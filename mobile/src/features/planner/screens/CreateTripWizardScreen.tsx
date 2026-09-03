import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '../../../components/AppText';
import { useTranslation } from '../../../i18n';
import type { RootStackParamList } from '../../../navigation/types';
import { useTheme } from '../../../theme';
import { radius, spacing, typography } from '../../../theme/tokens';
import { CreateTripSuccessView } from '../components/CreateTripSuccessView';
import { StepBudgetGroup } from '../components/StepBudgetGroup';
import { StepDates } from '../components/StepDates';
import { StepDestination } from '../components/StepDestination';
import { SupabaseDestinationSearchRepository } from '../../../integration/remote/SupabaseDestinationSearchRepository';
import type { DestinationSearchRepository } from '../../../integration/repositories/DestinationSearchRepository';
import { StepPreferences } from '../components/StepPreferences';
import { StepSummary } from '../components/StepSummary';
import { WizardProgressBar } from '../components/WizardProgressBar';
import { AbstractTripBuildCanvas } from '../motion/AbstractTripBuildCanvas';
import { CreateTripGenerationPresentation } from '../motion/CreateTripGenerationPresentation';
import { CreateTripMotionPreview } from '../motion/CreateTripMotionPreview';
import { useTripLifecycleCoordinator } from '../motion/useTripLifecycleCoordinator';
import { initialWizardState } from '../data/mockWizardData';
import type {
  BudgetTier,
  CreateTripWizardState,
  DestinationOption,
  GroupType,
  TravelPace,
  WizardStepNumber,
} from '../types';
import type { TripGenerationRepository } from '../../../integration/repositories';

type Props = {
  initialStep?: WizardStepNumber;
  initialState?: Partial<CreateTripWizardState>;
  onComplete?: (state: CreateTripWizardState) => void;
  onCancel?: () => void;
  generationRepository?: TripGenerationRepository;
  destinationSearchRepository?: DestinationSearchRepository;
};

export function CreateTripWizardScreen({
  initialStep = 1,
  initialState,
  onComplete,
  onCancel,
  generationRepository,
  destinationSearchRepository,
}: Props) {
  const defaultDestinationRepository = useMemo(() => new SupabaseDestinationSearchRepository(), []);
  const destRepo = destinationSearchRepository ?? defaultDestinationRepository;
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors, effectiveTheme } = useTheme();
  const { t } = useTranslation();

  const [currentStep, setCurrentStep] = useState<WizardStepNumber>(initialStep);
  const [stepError, setStepError] = useState<string | null>(null);

  const {
    status: motionStatus,
    frameAnim,
    draft,
    tripId,
    generationError,
    saveError,
    submit,
    retryGeneration,
    retrySave,
    cancel,
  } = useTripLifecycleCoordinator(generationRepository);

  const completedPreviewRef = useRef(false);
  const [isMotionPreviewOpen, setMotionPreviewOpen] = useState(false);

  const [wizardState, setWizardState] = useState<CreateTripWizardState>(() => ({
    ...initialWizardState,
    ...initialState,
  }));

  useEffect(() => {
    if (motionStatus === 'SAVE_SUCCESS' && !completedPreviewRef.current) {
      completedPreviewRef.current = true;
      onComplete?.(wizardState);
    }
  }, [motionStatus, onComplete, wizardState]);

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
    setWizardState((prev) => ({
      ...prev,
      customDestinationName: name,
      destination: null,
      tripTitle: `${name || 'Trip'} Adventure`,
    }));
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

    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];

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

  const handleCancel = useCallback(() => {
    cancel();
    onCancel?.();
  }, [cancel, onCancel]);

  const handleNext = useCallback(() => {
    // Validation rules per step
    if (currentStep === 1) {
      if (!wizardState.destination && !wizardState.customDestinationName.trim()) {
        setStepError(t('planner.validation.destinationRequired'));
        return;
      }
    } else if (currentStep === 2) {
      if (!wizardState.startDate || !wizardState.endDate) {
        setStepError(t('planner.validation.datesRequired'));
        return;
      }
      if (wizardState.durationDays < 1) {
        setStepError(t('planner.validation.durationMin'));
        return;
      }
    } else if (currentStep === 3) {
      if (wizardState.selectedStyles.length === 0) {
        setStepError(t('planner.validation.preferencesRequired'));
        return;
      }
    }

    setStepError(null);

    if (currentStep < 5) {
      setCurrentStep((prev) => (prev + 1) as WizardStepNumber);
    } else {
      completedPreviewRef.current = false;
      submit(wizardState);
    }
  }, [currentStep, submit, wizardState, t]);

  const handleViewItinerary = useCallback(() => {
    if (tripId) navigation.navigate('TripDetail', { tripId });
  }, [navigation, tripId]);

  const handleExplorePlaces = useCallback(() => {
    navigation.navigate('MainTabs');
  }, [navigation]);

  const handleSaveTrip = useCallback(() => {
    // Save is now automatic via coordinator. We no longer manually trigger save.
  }, []);

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
            repository={destRepo}
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
          <StepSummary
            onChangeTitle={handleChangeTitle}
            state={wizardState}
          />
        );
    }
  }, [
    currentStep,
    destRepo,
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

  if (__DEV__ && isMotionPreviewOpen) {
    return (
      <CreateTripMotionPreview
        destination={wizardState.destination?.name || wizardState.customDestinationName}
        durationDays={wizardState.durationDays}
        onClose={() => setMotionPreviewOpen(false)}
      />
    );
  }

  // Success celebration screen
  // Success celebration screen
  if (motionStatus === 'SAVE_SUCCESS' && draft) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background.surface, paddingTop: insets.top }]}>
        <CreateTripSuccessView
          onExplorePlaces={handleExplorePlaces}
          onSave={handleSaveTrip}
          saveStatus="success"
          onViewItinerary={handleViewItinerary}
          preview={draft}
          state={wizardState}
        />
      </View>
    );
  }

  // F000–F151 only: the composition is visual and frame-driven; the coordinator owns all effects.
  if (['SUBMITTING', 'GENERATING', 'GENERATION_HOLD', 'GENERATION_SUCCESS'].includes(motionStatus)) {
    return (
      <CreateTripGenerationPresentation
        colors={colors}
        destination={wizardState.destination?.name || wizardState.customDestinationName}
        durationDays={wizardState.durationDays}
        frameAnim={frameAnim}
      />
    );
  }

  // Persistence visuals begin at F152 and remain outside the corrective T003–T006 scope.
  if (motionStatus === 'SAVING') {
    return (
      <View
        accessibilityLabel={t('planner.generating')}
        accessibilityRole="progressbar"
        style={[styles.generatingContainer, { backgroundColor: colors.background.surface }]}>
        <AbstractTripBuildCanvas colors={colors} durationDays={wizardState.durationDays} frameAnim={frameAnim} />
        <View
          style={[
            styles.generatingCircle,
            { backgroundColor: effectiveTheme === 'dark' ? '#1E3A5F' : '#D8E2FF' },
          ]}>
          <MaterialIcons color={colors.brand.primary} name="auto-awesome" size={40} />
        </View>
        <ActivityIndicator color={colors.brand.primary} size="large" />
        <Text style={[styles.generatingTitle, { color: colors.text.primary }]}>
          {motionStatus === 'SAVING' ? t('planner.savingTrip') : t('planner.generatingTitle', {
            destination: wizardState.destination?.name || wizardState.customDestinationName || 'trip',
          })}
        </Text>
        <AppText style={styles.generatingSubtitle}>
          {t('planner.generatingSubtitle')}
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
      ]}>
      {/* Top Progress & Header */}
      <WizardProgressBar
        currentStep={currentStep}
        onBack={handleBack}
        onCancel={handleCancel}
        totalSteps={5}
      />

      {/* Main Step Body */}
      <View style={styles.body}>{stepContent}</View>

      {(motionStatus === 'GENERATION_ERROR' && generationError) || (motionStatus === 'SAVE_ERROR' && saveError) ? (
        <View accessibilityRole="alert" style={[styles.errorBanner, { backgroundColor: colors.background.surfaceVariant }]}>
          <Text style={[styles.errorText, { color: colors.state.error }]}>
            {motionStatus === 'GENERATION_ERROR' ? t(`planner.generationError.${generationError?.code}`) : t('planner.generationError.unknown')}
          </Text>
        </View>
      ) : null}

      {__DEV__ ? (
        <View style={styles.motionPreviewEntry}>
          <Pressable
            accessibilityLabel={t('planner.motionPreview')}
            accessibilityRole="button"
            onPress={() => setMotionPreviewOpen(true)}
            style={({ pressed }) => [
              styles.motionPreviewButton,
              { backgroundColor: colors.background.surfaceVariant, borderColor: colors.border.subtle },
              pressed && styles.pressed,
            ]}>
            <Text style={[styles.motionPreviewButtonText, { color: colors.text.primary }]}>{t('planner.motionPreview')}</Text>
          </Pressable>
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
        ]}>
        <Pressable
          accessibilityHint={
            currentStep === 5
              ? (motionStatus === 'GENERATION_ERROR' || motionStatus === 'SAVE_ERROR') ? t('common.retry') : t('planner.generateItinerary')
              : t('common.continue')
          }
          accessibilityLabel={
            currentStep === 5
              ? (motionStatus === 'GENERATION_ERROR' || motionStatus === 'SAVE_ERROR') ? t('common.retry') : t('planner.generateItinerary')
              : t('common.continue')
          }
          accessibilityRole="button"
          onPress={motionStatus === 'GENERATION_ERROR' ? () => void retryGeneration() : (motionStatus === 'SAVE_ERROR' ? () => void retrySave() : handleNext)}
          style={({ pressed }) => [
            styles.continueButton,
            { backgroundColor: colors.brand.primary },
            pressed && styles.pressed,
          ]}>
          <Text style={[styles.continueButtonText, { color: colors.text.inverse }]}>
            {currentStep === 5
              ? (motionStatus === 'GENERATION_ERROR' || motionStatus === 'SAVE_ERROR') ? t('common.retry') : t('planner.generateItinerary')
              : t('common.continue')}
          </Text>
          <MaterialIcons
            color={colors.text.inverse}
            name={currentStep === 5 ? 'auto-awesome' : 'arrow-forward'}
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
    textAlign: 'center',
  },
  motionPreviewButton: {
    alignItems: 'center',
    borderRadius: radius.control,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  motionPreviewButtonText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.fontWeight.bold,
  },
  motionPreviewEntry: {
    alignItems: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },
  continueButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    elevation: 3,
    flexDirection: 'row',
    gap: spacing.xs,
    height: 48,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    width: '100%',
  },
  continueButtonText: {
    fontSize: typography.body,
    fontWeight: typography.fontWeight.bold,
  },
  generatingContainer: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  generatingCircle: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 80,
    justifyContent: 'center',
    marginBottom: spacing.xs,
    width: 80,
  },
  generatingTitle: {
    fontSize: typography.titleSmall,
    fontWeight: typography.fontWeight.bold,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  generatingSubtitle: {
    fontSize: typography.bodySmall,
    lineHeight: 20,
    maxWidth: 280,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
