import type { ReminderCandidate, ReminderType } from './reminderEngine';
import { enTranslations } from '../i18n/en';
import { viTranslations } from '../i18n/vi';
import type { ReminderEligibility, ReminderPresentation } from './reminderScheduling';

export type NotificationIntent = {
  tripReminders: boolean;
  itineraryReminders: boolean;
};

export const DEFAULT_NOTIFICATION_INTENT: NotificationIntent = Object.freeze({
  tripReminders: false,
  itineraryReminders: false,
});

export type NotificationPermissionState =
  | 'unknown'
  | 'granted'
  | 'denied_requestable'
  | 'denied_blocked'
  | 'legacy_enabled'
  | 'legacy_disabled';

export type EffectiveReminderPolicyReason =
  | 'enabled'
  | 'no_authenticated_user'
  | 'no_enabled_preferences'
  | 'permission_unknown'
  | 'permission_denied'
  | 'permission_blocked'
  | 'stale_session';

export type EffectiveReminderPolicy = {
  canSchedule: boolean;
  allowedTypes: readonly ReminderType[];
  reason: EffectiveReminderPolicyReason;
  presentationFor(candidate: ReminderCandidate): ReminderPresentation | null;
};

export type NotificationLocale = 'en' | 'vi';

const tripTypes: readonly ReminderType[] = ['TRIP_STARTING_SOON'];
const itineraryTypes: readonly ReminderType[] = ['DAY_STARTING', 'PLACE_UPCOMING', 'LEAVE_SOON', 'LATE_RISK'];

export function allowedReminderTypes(intent: NotificationIntent): readonly ReminderType[] {
  return [
    ...(intent.tripReminders === true ? tripTypes : []),
    ...(intent.itineraryReminders === true ? itineraryTypes : []),
  ];
}

function permissionReason(permission: NotificationPermissionState): EffectiveReminderPolicyReason {
  if (permission === 'unknown') return 'permission_unknown';
  if (permission === 'denied_blocked') return 'permission_blocked';
  return 'permission_denied';
}

export function createEffectiveReminderPolicy(input: {
  authenticated: boolean;
  intent: NotificationIntent;
  permission: NotificationPermissionState;
  locale: NotificationLocale;
  stale?: boolean;
}): EffectiveReminderPolicy {
  const allowedTypes = allowedReminderTypes(input.intent);
  const permissionEnabled = input.permission === 'granted' || input.permission === 'legacy_enabled';
  const reason: EffectiveReminderPolicyReason = input.stale
    ? 'stale_session'
    : !input.authenticated
      ? 'no_authenticated_user'
      : allowedTypes.length === 0
        ? 'no_enabled_preferences'
        : permissionEnabled
          ? 'enabled'
          : permissionReason(input.permission);
  const canSchedule = reason === 'enabled';
  const allowed = new Set(allowedTypes);
  return {
    canSchedule,
    allowedTypes,
    reason,
    presentationFor(candidate) {
      if (!canSchedule || !allowed.has(candidate.type)) return null;
      const translations = input.locale === 'vi' ? viTranslations : enTranslations;
      return { title: translations[`notifications.presentation.${candidate.type}`] };
    },
  };
}

/** Keeps T002 independent of preferences, UI, Expo and Android permission objects. */
export function asReminderEligibility(policy: EffectiveReminderPolicy): ReminderEligibility {
  return { canSchedule: policy.canSchedule, presentationFor: policy.presentationFor };
}
