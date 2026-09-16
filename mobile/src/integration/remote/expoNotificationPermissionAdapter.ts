import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';

import { IntegrationError } from '../errors';
import type { NotificationPermissionState } from '../notificationPolicy';
import type { NotificationPermissionAdapter } from '../notificationPolicyController';
import { ExpoReminderNotificationRepository } from './expoNotificationRepository';

export function classifyNotificationPermission(response: unknown, platform: string, api: number): NotificationPermissionState {
  if (platform !== 'android' || !Number.isInteger(api) || api < 1 || !response || typeof response !== 'object') return 'unknown';
  const value = response as Record<string, unknown>;
  if (typeof value.granted !== 'boolean' || typeof value.canAskAgain !== 'boolean'
    || !['granted', 'denied', 'undetermined'].includes(value.status as string)) return 'unknown';
  // SDK Android status also accounts for areNotificationsEnabled; granted alone does not.
  if (value.granted && value.status === 'granted') return api < 33 ? 'legacy_enabled' : 'granted';
  if (api < 33) return 'legacy_disabled';
  if (value.status === 'undetermined') return value.canAskAgain ? 'unknown' : 'denied_blocked';
  return value.canAskAgain ? 'denied_requestable' : 'denied_blocked';
}

export class ExpoNotificationPermissionAdapter implements NotificationPermissionAdapter {
  async get(): Promise<NotificationPermissionState> {
    return classifyNotificationPermission(await Notifications.getPermissionsAsync(), Platform.OS, Number(Platform.Version));
  }
  async requestFromExplicitUserAction(isCurrent: () => boolean): Promise<NotificationPermissionState> {
    const current = await this.get();
    if (!isCurrent()) throw new IntegrationError('cancelled');
    if (Platform.OS !== 'android' || Number(Platform.Version) < 33
      || !['unknown', 'denied_requestable'].includes(current)) return current;
    // Recheck the SDK's actual canAskAgain before the one explicit prompt.
    const response = await Notifications.getPermissionsAsync();
    if (!isCurrent()) throw new IntegrationError('cancelled');
    if (response.canAskAgain !== true || !['undetermined', 'denied'].includes(response.status)) {
      return classifyNotificationPermission(response, Platform.OS, Number(Platform.Version));
    }
    // Android 13+ requires a channel before the permission dialog. Only on explicit opt-in.
    await new ExpoReminderNotificationRepository().prepare();
    if (!isCurrent()) throw new IntegrationError('cancelled');
    const result = await Notifications.requestPermissionsAsync();
    if (!isCurrent()) throw new IntegrationError('cancelled');
    return classifyNotificationPermission(result, Platform.OS, Number(Platform.Version));
  }
  async openSettings(): Promise<void> { await Linking.openSettings(); }
}
