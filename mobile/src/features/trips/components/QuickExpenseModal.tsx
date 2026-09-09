import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { memo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { ExpenseCategory, ExpenseOrigin } from '../../../integration/contracts';
import { FX_CURRENCIES } from '../../../integration/fxContract';
import { useTranslation } from '../../../i18n';
import { useTheme } from '../../../theme';
import { radius, spacing, typography } from '../../../theme/tokens';
import {
  parseQuickExpenseAmount,
  type QuickExpenseDraft,
} from '../useTripExpensesController';

type Props = {
  visible: boolean;
  draft: QuickExpenseDraft;
  saving: boolean;
  onClose: () => void;
  onUpdateDraft: <K extends keyof QuickExpenseDraft>(field: K, value: QuickExpenseDraft[K]) => void;
  onSubmit: () => Promise<boolean>;
};

const CATEGORIES: ExpenseCategory[] = [
  'food',
  'transport',
  'accommodation',
  'activity',
  'shopping',
  'other',
];

const ORIGINS: ExpenseOrigin[] = ['actual', 'planned'];

export const QuickExpenseModal = memo(function QuickExpenseModal({
  visible,
  draft,
  saving,
  onClose,
  onUpdateDraft,
  onSubmit,
}: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSave = async () => {
    if (parseQuickExpenseAmount(draft.amount) === null) {
      setValidationError(t('tripExpenses.amountRequired'));
      return;
    }
    setValidationError(null);
    const success = await onSubmit();
    if (!success) {
      setValidationError(t('tripExpenses.errorLoading'));
    }
  };

  const handleClose = () => {
    setValidationError(null);
    onClose();
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={handleClose}
      transparent
      visible={visible}>
      <View style={styles.scrim}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.avoidingView}>
          <View
            accessible
            accessibilityLabel={t('tripExpenses.addExpense')}
            style={[styles.sheet, { backgroundColor: colors.background.surface }]}>
            {/* Sheet Handle */}
            <View style={[styles.handle, { backgroundColor: colors.border.default }]} />

            {/* Title */}
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.text.primary }]}>
                {t('tripExpenses.addExpense')}
              </Text>
              <Pressable
                accessibilityLabel={t('tripExpenses.cancel')}
                accessibilityRole="button"
                hitSlop={8}
                onPress={handleClose}>
                <MaterialIcons color={colors.text.muted} name="close" size={24} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Validation Error */}
              {validationError ? (
                <View
                  accessibilityRole="alert"
                  style={[styles.errorBox, { backgroundColor: 'rgba(211, 47, 47, 0.1)' }]}>
                  <Text style={[styles.errorText, { color: colors.state.error }]}>
                    {validationError}
                  </Text>
                </View>
              ) : null}

              {/* Amount & Currency Row */}
              <Text style={[styles.label, { color: colors.text.secondary }]}>
                {t('tripExpenses.amount')} *
              </Text>
              <View style={styles.amountRow}>
                <TextInput
                  accessibilityLabel={t('tripExpenses.amount')}
                  keyboardType="numeric"
                  onChangeText={(val) => {
                    setValidationError(null);
                    onUpdateDraft('amount', val);
                  }}
                  placeholder={t('tripExpenses.amountPlaceholder')}
                  placeholderTextColor={colors.text.muted}
                  style={[
                    styles.amountInput,
                    {
                      backgroundColor: colors.background.surfaceVariant,
                      borderColor: colors.border.default,
                      color: colors.text.primary,
                    },
                  ]}
                  value={draft.amount}
                />
              </View>

              {/* Currency Selector Chips */}
              <Text style={[styles.label, { color: colors.text.secondary }]}>
                {t('tripExpenses.currency')}
              </Text>
              <ScrollView
                contentContainerStyle={styles.chipsRow}
                horizontal
                showsHorizontalScrollIndicator={false}>
                {FX_CURRENCIES.map((c) => {
                  const selected = draft.currency === c;
                  return (
                    <Pressable
                      key={c}
                      accessibilityLabel={`${t('tripExpenses.currency')}: ${c}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      hitSlop={6}
                      onPress={() => onUpdateDraft('currency', c)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: selected ? colors.brand.primary : colors.background.surfaceVariant,
                          borderColor: selected ? colors.brand.primary : colors.border.default,
                        },
                      ]}>
                      <Text
                        style={[
                          styles.chipText,
                          { color: selected ? colors.text.inverse : colors.text.primary },
                        ]}>
                        {c}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* Origin / Type: Actual vs Planned */}
              <Text style={[styles.label, { color: colors.text.secondary }]}>
                {t('tripExpenses.origin')}
              </Text>
              <View style={styles.originRow}>
                {ORIGINS.map((orig) => {
                  const selected = draft.origin === orig;
                  return (
                    <Pressable
                      key={orig}
                      accessibilityLabel={orig === 'actual' ? t('tripExpenses.originActual') : t('tripExpenses.originPlanned')}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => onUpdateDraft('origin', orig)}
                      style={[
                        styles.originButton,
                        {
                          backgroundColor: selected ? colors.brand.primary : colors.background.surfaceVariant,
                          borderColor: selected ? colors.brand.primary : colors.border.default,
                        },
                      ]}>
                      <Text
                        style={[
                          styles.originButtonText,
                          { color: selected ? colors.text.inverse : colors.text.primary },
                        ]}>
                        {orig === 'actual' ? t('tripExpenses.originActual') : t('tripExpenses.originPlanned')}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Category Chips */}
              <Text style={[styles.label, { color: colors.text.secondary }]}>
                {t('tripExpenses.category')}
              </Text>
              <View style={styles.categoriesWrap}>
                {CATEGORIES.map((cat) => {
                  const selected = draft.category === cat;
                  return (
                    <Pressable
                      key={cat}
                      accessibilityLabel={`${t('tripExpenses.category')}: ${t(`expenseCategory.${cat}`)}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      hitSlop={6}
                      onPress={() => onUpdateDraft('category', cat)}
                      style={[
                        styles.categoryChip,
                        {
                          backgroundColor: selected ? colors.brand.primary : colors.background.surfaceVariant,
                          borderColor: selected ? colors.brand.primary : colors.border.default,
                        },
                      ]}>
                      <Text
                        style={[
                          styles.chipText,
                          { color: selected ? colors.text.inverse : colors.text.primary },
                        ]}>
                        {t(`expenseCategory.${cat}`)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Note Input */}
              <Text style={[styles.label, { color: colors.text.secondary }]}>
                {t('tripExpenses.note')}
              </Text>
              <TextInput
                accessibilityLabel={t('tripExpenses.note')}
                maxLength={200}
                onChangeText={(val) => onUpdateDraft('note', val)}
                placeholder={t('tripExpenses.notePlaceholder')}
                placeholderTextColor={colors.text.muted}
                style={[
                  styles.noteInput,
                  {
                    backgroundColor: colors.background.surfaceVariant,
                    borderColor: colors.border.default,
                    color: colors.text.primary,
                  },
                ]}
                value={draft.note}
              />

              {/* Action Buttons */}
              <View style={styles.footerRow}>
                <Pressable
                  accessibilityLabel={t('tripExpenses.cancel')}
                  accessibilityRole="button"
                  disabled={saving}
                  onPress={handleClose}
                  style={[styles.cancelButton, { borderColor: colors.border.default }]}>
                  <Text style={{ color: colors.text.primary }}>{t('tripExpenses.cancel')}</Text>
                </Pressable>

                <Pressable
                  accessibilityLabel={saving ? t('tripExpenses.saving') : t('tripExpenses.save')}
                  accessibilityRole="button"
                  disabled={saving}
                  onPress={handleSave}
                  style={[
                    styles.saveButton,
                    { backgroundColor: colors.brand.primary },
                    saving && styles.disabledButton,
                  ]}>
                  {saving ? (
                    <ActivityIndicator color={colors.text.inverse} size="small" />
                  ) : (
                    <Text style={[styles.saveButtonText, { color: colors.text.inverse }]}>
                      {t('tripExpenses.save')}
                    </Text>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  scrim: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  avoidingView: {
    width: '100%',
  },
  sheet: {
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    maxHeight: '90%',
    padding: spacing.md,
  },
  handle: {
    alignSelf: 'center',
    borderRadius: radius.pill,
    height: 4,
    marginBottom: spacing.sm,
    width: 44,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: typography.titleSmall,
    fontWeight: typography.fontWeight.bold,
  },
  errorBox: {
    borderRadius: radius.card,
    marginBottom: spacing.sm,
    padding: spacing.sm,
  },
  errorText: {
    fontSize: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: typography.fontWeight.bold,
    marginBottom: 4,
    marginTop: spacing.sm,
    textTransform: 'uppercase',
  },
  amountRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  amountInput: {
    borderRadius: radius.card,
    borderWidth: 1,
    flex: 1,
    fontSize: 18,
    fontWeight: typography.fontWeight.bold,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingVertical: 2,
  },
  chip: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 36,
    minWidth: 44,
    paddingHorizontal: spacing.sm,
  },
  chipText: {
    fontSize: 12,
    fontWeight: typography.fontWeight.semibold,
  },
  originRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  originButton: {
    alignItems: 'center',
    borderRadius: radius.card,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingVertical: spacing.xs,
  },
  originButtonText: {
    fontSize: 13,
    fontWeight: typography.fontWeight.semibold,
  },
  categoriesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  categoryChip: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  noteInput: {
    borderRadius: radius.card,
    borderWidth: 1,
    fontSize: 14,
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  footerRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  cancelButton: {
    alignItems: 'center',
    borderRadius: radius.card,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
  },
  saveButton: {
    alignItems: 'center',
    borderRadius: radius.card,
    flex: 2,
    justifyContent: 'center',
    minHeight: 48,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: typography.fontWeight.bold,
  },
  disabledButton: {
    opacity: 0.6,
  },
});
