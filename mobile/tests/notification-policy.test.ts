import { allowedReminderTypes, asReminderEligibility, createEffectiveReminderPolicy, DEFAULT_NOTIFICATION_INTENT, type NotificationPermissionState } from '../src/integration/notificationPolicy';
import type { ReminderCandidate, ReminderType } from '../src/integration/reminderEngine';

const types: ReminderType[] = ['TRIP_STARTING_SOON', 'DAY_STARTING', 'PLACE_UPCOMING', 'LEAVE_SOON', 'LATE_RISK'];
const base = { authenticated: true, intent: { tripReminders: true, itineraryReminders: true }, permission: 'granted' as const, locale: 'en' as const };
const candidate = (type: ReminderType): ReminderCandidate => new Proxy({ type } as ReminderCandidate, {
  get(target, key) { if (key !== 'type') throw new Error('Private candidate fields must never be read'); return target.type; },
});

describe('T003 pure notification policy', () => {
  it('defaults both off and fails closed even with OS grant', () => {
    const policy = createEffectiveReminderPolicy({ ...base, intent: DEFAULT_NOTIFICATION_INTENT });
    expect(policy.canSchedule).toBe(false);
    expect(policy.reason).toBe('no_enabled_preferences');
    expect(policy.allowedTypes).toEqual([]);
  });
  it.each([
    [true, false, types.slice(0, 1)], [false, true, types.slice(1)], [true, true, types], [false, false, []],
  ])('maps trip=%s itinerary=%s exactly', (tripReminders, itineraryReminders, expected) => {
    const intent = { tripReminders: tripReminders as boolean, itineraryReminders: itineraryReminders as boolean };
    expect(allowedReminderTypes(intent)).toEqual(expected);
    const policy = createEffectiveReminderPolicy({ ...base, intent });
    for (const type of types) expect(policy.presentationFor(candidate(type)) !== null).toBe((expected as ReminderType[]).includes(type));
  });
  it.each<NotificationPermissionState>(['unknown', 'denied_requestable', 'denied_blocked', 'legacy_disabled'])('fails closed with %s', (permission) => {
    const policy = createEffectiveReminderPolicy({ ...base, permission });
    expect(policy.canSchedule).toBe(false);
    for (const type of types) expect(policy.presentationFor(candidate(type))).toBeNull();
  });
  it.each<NotificationPermissionState>(['granted', 'legacy_enabled'])('allows %s', (permission) => {
    expect(createEffectiveReminderPolicy({ ...base, permission }).canSchedule).toBe(true);
  });
  it('fails closed without an authenticated owner and on stale sessions', () => {
    expect(createEffectiveReminderPolicy({ ...base, authenticated: false }).reason).toBe('no_authenticated_user');
    expect(createEffectiveReminderPolicy({ ...base, stale: true }).reason).toBe('stale_session');
  });
  it.each(['en', 'vi'] as const)('uses only approved static %s presentation without reading sensitive candidate fields', (locale) => {
    const expected = locale === 'en' ? [
      'Your trip reminder is ready.', 'You have an itinerary reminder today.', 'An itinerary activity is coming up.',
      'It may be time to leave for your next activity.', 'Your next itinerary activity may need attention.',
    ] : [
      'Nhắc nhở chuyến đi của bạn đã sẵn sàng.', 'Bạn có một nhắc nhở lịch trình hôm nay.', 'Một hoạt động trong lịch trình sắp diễn ra.',
      'Có thể đã đến lúc bạn nên đi đến hoạt động tiếp theo.', 'Hoạt động tiếp theo trong lịch trình có thể cần bạn chú ý.',
    ];
    const policy = createEffectiveReminderPolicy({ ...base, locale });
    expect(types.map((type) => policy.presentationFor(candidate(type)))).toEqual(expected.map((title) => ({ title })));
    expect(Object.keys(asReminderEligibility(policy)).sort()).toEqual(['canSchedule', 'presentationFor']);
  });
});
