import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppText } from '../../../components/AppText';
import { useTranslation } from '../../../i18n';
import { useTheme } from '../../../theme';
import { radius, spacing, typography } from '../../../theme/tokens';
import type { SavedTripDetail } from '../../../integration/contracts';
import type { WorkspaceMoveController } from '../useWorkspaceMoveController';

export function WorkspaceMoveSheet({ detail, controller }: { detail: SavedTripDetail | null; controller: WorkspaceMoveController }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const visible = controller.selectedItemId !== null;
  return (
    <Modal animationType="none" onRequestClose={controller.close} transparent visible={visible}>
      <View style={styles.scrim}>
        <View accessible accessibilityLabel={t('workspaceMove.title')} style={[styles.sheet, { backgroundColor: colors.background.surface }]}>
          <View style={[styles.handle, { backgroundColor: colors.border.default }]} />
          <Text style={[styles.title, { color: colors.text.primary }]}>{t('workspaceMove.title')}</Text>
          <AppText style={styles.subtitle}>{controller.selectedItemName}</AppText>
          {controller.conflict ? (
            <View accessibilityRole="alert" style={[styles.alert, { backgroundColor: colors.background.canvas }]}>
              <Text style={[styles.alertTitle, { color: colors.text.primary }]}>{t('workspaceMove.conflictTitle')}</Text>
              <AppText>{t('workspaceMove.conflictBody')}</AppText>
            </View>
          ) : null}
          {controller.errorKey ? <Text accessibilityRole="alert" style={[styles.error, { color: colors.state.error }]}>{t(controller.errorKey)}</Text> : null}
          <Text style={[styles.label, { color: colors.text.primary }]}>{t('workspaceMove.targetDay')}</Text>
          <ScrollView contentContainerStyle={styles.choices} horizontal showsHorizontalScrollIndicator={false}>
            {detail?.days.map((day) => {
              const selected = day.id === controller.targetDayId;
              return <Pressable key={day.id} accessibilityLabel={`${t('workspaceMove.targetDay')} ${day.dayNumber}`} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => controller.setTargetDayId(day.id)} style={[styles.choice, { borderColor: selected ? colors.brand.primary : colors.border.default, backgroundColor: selected ? colors.brand.primary : colors.background.canvas }]}>
                <Text style={{ color: selected ? colors.text.inverse : colors.text.primary }}>{t('workspaceMove.day', { number: day.dayNumber })}</Text>
              </Pressable>;
            })}
          </ScrollView>
          <Text style={[styles.label, { color: colors.text.primary }]}>{t('workspaceMove.targetPosition')}</Text>
          <View style={styles.positions}>
            {controller.positions.map((position) => {
              const selected = position === controller.targetPosition;
              return <Pressable key={position} accessibilityLabel={`${t('workspaceMove.position', { number: position })}`} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => controller.setTargetPosition(position)} style={[styles.position, { borderColor: selected ? colors.brand.primary : colors.border.default, backgroundColor: selected ? colors.brand.primary : colors.background.canvas }]}>
                <Text style={{ color: selected ? colors.text.inverse : colors.text.primary }}>{position}</Text>
              </Pressable>;
            })}
          </View>
          <View style={styles.footer}>
            <Pressable accessibilityLabel={t('common.cancel')} accessibilityRole="button" disabled={controller.saving} onPress={controller.close} style={[styles.cancel, { borderColor: colors.border.default }]}><Text style={{ color: colors.text.primary }}>{t('common.cancel')}</Text></Pressable>
            <Pressable accessibilityLabel={controller.saving ? t('workspaceMove.saving') : t('workspaceMove.save')} accessibilityRole="button" disabled={controller.saving || !controller.mutationReady} onPress={() => { void controller.submit(); }} style={[styles.save, { backgroundColor: colors.brand.primary }, (controller.saving || !controller.mutationReady) && styles.disabled]}><Text style={{ color: colors.text.inverse }}>{controller.saving ? t('workspaceMove.saving') : t('workspaceMove.save')}</Text></Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { backgroundColor: 'rgba(0,0,0,0.45)', flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card, maxHeight: '82%', padding: spacing.lg },
  handle: { alignSelf: 'center', borderRadius: radius.pill, height: 4, marginBottom: spacing.md, width: 44 },
  title: { fontSize: typography.titleSmall, fontWeight: typography.fontWeight.bold },
  subtitle: { marginTop: spacing.xs },
  label: { fontSize: typography.bodySmall, fontWeight: typography.fontWeight.semibold, marginTop: spacing.lg },
  choices: { gap: spacing.sm, paddingVertical: spacing.sm },
  choice: { alignItems: 'center', borderRadius: radius.pill, borderWidth: 1, justifyContent: 'center', minHeight: 44, paddingHorizontal: spacing.md },
  positions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  position: { alignItems: 'center', borderRadius: radius.pill, borderWidth: 1, height: 44, justifyContent: 'center', width: 44 },
  footer: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl },
  cancel: { alignItems: 'center', borderRadius: radius.pill, borderWidth: 1, flex: 1, height: 48, justifyContent: 'center' },
  save: { alignItems: 'center', borderRadius: radius.pill, flex: 1, height: 48, justifyContent: 'center' },
  disabled: { opacity: 0.55 },
  error: { fontSize: typography.bodySmall, marginTop: spacing.md },
  alert: { borderRadius: radius.input, gap: spacing.xs, marginTop: spacing.md, padding: spacing.sm },
  alertTitle: { fontSize: typography.bodySmall, fontWeight: typography.fontWeight.bold },
});
