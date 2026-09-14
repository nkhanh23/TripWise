jest.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
  setNotificationChannelAsync: jest.fn().mockResolvedValue(null),
  getAllScheduledNotificationsAsync: jest.fn().mockResolvedValue([]),
  scheduleNotificationAsync: jest.fn().mockResolvedValue('native-id'),
  cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
}));

import * as Notifications from 'expo-notifications';
import { ExpoReminderNotificationRepository } from '../src/integration/remote/expoNotificationRepository';
import type { ReminderScheduleRequest } from '../src/integration/reminderScheduling';

const request: ReminderScheduleRequest = {
  logicalId: `tw-r1-${'a'.repeat(32)}`,
  fingerprint: 'b'.repeat(32),
  ownerScope: `tw-owner-${'c'.repeat(32)}`,
  tripId: '10000000-0000-4000-8000-000000000010',
  type: 'PLACE_UPCOMING',
  triggerAt: Date.UTC(2028, 0, 2, 3),
  dayId: '10000000-0000-4000-8000-000000000011',
  itemId: '10000000-0000-4000-8000-000000000020',
  presentation: { title: 'Controlled presentation', body: 'Supplied by the policy boundary' },
};

describe('ExpoReminderNotificationRepository', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates the Android channel without exact-alarm access', async () => {
    await new ExpoReminderNotificationRepository().prepare();
    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith('tripwise-reminders-v1', expect.objectContaining({
      name: 'Trip reminders', importance: Notifications.AndroidImportance.DEFAULT,
    }));
  });

  it('schedules one date notification with opaque identity data', async () => {
    await expect(new ExpoReminderNotificationRepository().schedule(request)).resolves.toBe('native-id');
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(expect.objectContaining({
      identifier: request.logicalId,
      trigger: expect.objectContaining({ type: 'date', date: new Date(request.triggerAt), channelId: 'tripwise-reminders-v1' }),
      content: expect.objectContaining({
        title: request.presentation.title,
        data: expect.objectContaining({ marker: 'TRIPWISE_REMINDER_V1', logicalId: request.logicalId, fingerprint: request.fingerprint }),
      }),
    }));
    const payload = JSON.stringify(jest.mocked(Notifications.scheduleNotificationAsync).mock.calls[0][0]);
    expect(payload).not.toContain('latitude');
    expect(payload).not.toContain('longitude');
    expect(payload).not.toContain('placeName');
  });

  it('enumerates only validated TripWise reminders', async () => {
    jest.mocked(Notifications.getAllScheduledNotificationsAsync).mockResolvedValueOnce([
      { identifier: 'native-id', trigger: null, content: { title: null, subtitle: null, body: null, data: {
        marker: 'TRIPWISE_REMINDER_V1', logicalId: request.logicalId, fingerprint: request.fingerprint,
        ownerScope: request.ownerScope, tripId: request.tripId, type: request.type, triggerAt: request.triggerAt,
      }, categoryIdentifier: null, sound: null } },
      { identifier: 'foreign', trigger: null, content: { title: null, subtitle: null, body: null, data: {
        marker: 'OTHER_NOTIFICATION',
      }, categoryIdentifier: null, sound: null } },
    ]);
    await expect(new ExpoReminderNotificationRepository().list()).resolves.toEqual([expect.objectContaining({
      nativeId: 'native-id', logicalId: request.logicalId, fingerprint: request.fingerprint,
    })]);
  });

  it('cancels explicitly by returned native identifier', async () => {
    await new ExpoReminderNotificationRepository().cancel('native-id');
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('native-id');
  });
});

