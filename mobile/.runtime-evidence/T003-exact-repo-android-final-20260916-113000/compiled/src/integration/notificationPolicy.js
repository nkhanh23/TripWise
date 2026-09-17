"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_NOTIFICATION_INTENT = void 0;
exports.allowedReminderTypes = allowedReminderTypes;
exports.createEffectiveReminderPolicy = createEffectiveReminderPolicy;
exports.asReminderEligibility = asReminderEligibility;
const en_1 = require("../i18n/en");
const vi_1 = require("../i18n/vi");
exports.DEFAULT_NOTIFICATION_INTENT = Object.freeze({
    tripReminders: false,
    itineraryReminders: false,
});
const tripTypes = ['TRIP_STARTING_SOON'];
const itineraryTypes = ['DAY_STARTING', 'PLACE_UPCOMING', 'LEAVE_SOON', 'LATE_RISK'];
function allowedReminderTypes(intent) {
    return [
        ...(intent.tripReminders === true ? tripTypes : []),
        ...(intent.itineraryReminders === true ? itineraryTypes : []),
    ];
}
function permissionReason(permission) {
    if (permission === 'unknown')
        return 'permission_unknown';
    if (permission === 'denied_blocked')
        return 'permission_blocked';
    return 'permission_denied';
}
function createEffectiveReminderPolicy(input) {
    const allowedTypes = allowedReminderTypes(input.intent);
    const permissionEnabled = input.permission === 'granted' || input.permission === 'legacy_enabled';
    const reason = input.stale
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
            if (!canSchedule || !allowed.has(candidate.type))
                return null;
            const translations = input.locale === 'vi' ? vi_1.viTranslations : en_1.enTranslations;
            return { title: translations[`notifications.presentation.${candidate.type}`] };
        },
    };
}
/** Keeps T002 independent of preferences, UI, Expo and Android permission objects. */
function asReminderEligibility(policy) {
    return { canSchedule: policy.canSchedule, presentationFor: policy.presentationFor };
}
