import { useEffect, useSyncExternalStore } from 'react';
import { useTranslation } from '../../../i18n';
import { createEffectiveReminderPolicy } from '../../../integration/notificationPolicy';
import { notificationPolicyController } from '../../../integration/notificationPolicyRuntime';

export function useNotificationPolicyController() {
  const { locale } = useTranslation();
  const state = useSyncExternalStore(notificationPolicyController.subscribe, notificationPolicyController.getSnapshot);
  useEffect(() => { notificationPolicyController.setLocale(locale); }, [locale]);
  const policy = createEffectiveReminderPolicy({ authenticated: !!state.session && !state.loading,
    intent: state.intent, permission: state.permission, locale,
    stale: state.stale });
  return {
    ...state, policy,
    setTripReminders: (enabled: boolean) => notificationPolicyController.setCategory('tripReminders', enabled),
    setItineraryReminders: (enabled: boolean) => notificationPolicyController.setCategory('itineraryReminders', enabled),
    openSystemSettings: () => notificationPolicyController.openSystemSettings(),
    retry: () => notificationPolicyController.retry(),
  };
}
