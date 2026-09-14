import * as Notifications from 'expo-notifications';
import type {
  ReminderNotificationRepository,
  ReminderScheduleRequest,
  ScheduledReminder,
} from '../reminderScheduling';

const CHANNEL_ID = 'tripwise-reminders-v1';
const MARKER = 'TRIPWISE_REMINDER_V1';
const TYPES = new Set(['TRIP_STARTING_SOON', 'DAY_STARTING', 'PLACE_UPCOMING', 'LEAVE_SOON', 'LATE_RISK']);
const OPAQUE_ID = /^tw-r1-[a-f0-9]{32}$/;
const OWNER_SCOPE = /^tw-owner-[a-f0-9]{32}$/;

function scheduledReminder(value: Notifications.NotificationRequest): ScheduledReminder | null {
  const data = value.content.data;
  if (!data || data.marker !== MARKER || typeof value.identifier !== 'string'
    || typeof data.logicalId !== 'string' || !OPAQUE_ID.test(data.logicalId)
    || typeof data.fingerprint !== 'string' || !/^[a-f0-9]{32}$/.test(data.fingerprint)
    || typeof data.ownerScope !== 'string' || !OWNER_SCOPE.test(data.ownerScope)
    || typeof data.tripId !== 'string' || typeof data.type !== 'string' || !TYPES.has(data.type)
    || typeof data.triggerAt !== 'number' || !Number.isFinite(data.triggerAt)) return null;
  return {
    nativeId: value.identifier,
    logicalId: data.logicalId,
    fingerprint: data.fingerprint,
    ownerScope: data.ownerScope,
    tripId: data.tripId,
    type: data.type as ScheduledReminder['type'],
    triggerAt: data.triggerAt,
  };
}

/** Native-only boundary. Permission/consent and visible copy are supplied by T003. */
export class ExpoReminderNotificationRepository implements ReminderNotificationRepository {
  async prepare(): Promise<void> {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Trip reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  async list(): Promise<ScheduledReminder[]> {
    const requests = await Notifications.getAllScheduledNotificationsAsync();
    return requests.map(scheduledReminder).filter((value): value is ScheduledReminder => value !== null);
  }

  async schedule(request: ReminderScheduleRequest): Promise<string> {
    return Notifications.scheduleNotificationAsync({
      identifier: request.logicalId,
      content: {
        title: request.presentation.title,
        ...(request.presentation.body === undefined ? {} : { body: request.presentation.body }),
        data: {
          marker: MARKER,
          logicalId: request.logicalId,
          fingerprint: request.fingerprint,
          ownerScope: request.ownerScope,
          tripId: request.tripId,
          type: request.type,
          triggerAt: request.triggerAt,
          ...(request.dayId === undefined ? {} : { dayId: request.dayId }),
          ...(request.itemId === undefined ? {} : { itemId: request.itemId }),
          ...(request.originItemId === undefined ? {} : { originItemId: request.originItemId }),
          ...(request.destinationItemId === undefined ? {} : { destinationItemId: request.destinationItemId }),
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(request.triggerAt),
        channelId: CHANNEL_ID,
      },
    });
  }

  async cancel(nativeId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(nativeId);
  }
}

