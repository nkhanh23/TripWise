jest.mock('expo-notifications', () => ({ getPermissionsAsync: jest.fn(), requestPermissionsAsync: jest.fn(), AndroidImportance: { DEFAULT: 3 }, setNotificationChannelAsync: jest.fn().mockResolvedValue(null) }));
import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';
import { classifyNotificationPermission, ExpoNotificationPermissionAdapter } from '../src/integration/remote/expoNotificationPermissionAdapter';

describe('installed Expo notification permission adapter', () => {
  const originalVersion = Platform.Version;
  beforeEach(() => { jest.clearAllMocks(); Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' }); Object.defineProperty(Platform, 'Version', { configurable: true, value: 33 }); });
  afterAll(() => { Object.defineProperty(Platform, 'Version', { configurable: true, value: originalVersion }); });
  it.each([
    [32, 'granted', true, true, 'legacy_enabled'], [32, 'denied', false, false, 'legacy_disabled'],
    [33, 'granted', true, true, 'granted'], [37, 'denied', false, true, 'denied_requestable'],
    [37, 'denied', false, false, 'denied_blocked'], [33, 'undetermined', false, true, 'unknown'],
    [33, 'denied', true, false, 'denied_blocked'],
  ])('API %s status=%s validates platform semantics', (api, status, granted, canAskAgain, expected) => {
    expect(classifyNotificationPermission({ status, granted, canAskAgain }, 'android', api as number)).toBe(expected);
  });
  it.each([null, {}, { granted: 'true', canAskAgain: true }, { status: 'invented', granted: true, canAskAgain: true }])('invalid response fails closed', (response) => {
    expect(classifyNotificationPermission(response, 'android', 33)).toBe('unknown');
  });
  it('read has no request side effect', async () => {
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({ status: 'undetermined', granted: false, canAskAgain: true } as never);
    await new ExpoNotificationPermissionAdapter().get(); expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });
  it('explicit >=33 request grants once', async () => {
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({ status: 'undetermined', granted: false, canAskAgain: true } as never);
    jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValue({ status: 'granted', granted: true, canAskAgain: true } as never);
    expect(await new ExpoNotificationPermissionAdapter().requestFromExplicitUserAction(() => true)).toBe('granted');
    expect(Notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(jest.mocked(Notifications.setNotificationChannelAsync).mock.invocationCallOrder[0]).toBeLessThan(jest.mocked(Notifications.requestPermissionsAsync).mock.invocationCallOrder[0]);
  });
  it('pre-33 never calls runtime request, including legacy disabled', async () => {
    Object.defineProperty(Platform, 'Version', { configurable: true, value: 32 });
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({ status: 'denied', granted: false, canAskAgain: false } as never);
    expect(await new ExpoNotificationPermissionAdapter().requestFromExplicitUserAction(() => true)).toBe('legacy_disabled');
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });
  it('blocked does not request again; opening settings is explicit', async () => {
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({ status: 'denied', granted: false, canAskAgain: false } as never);
    const open = jest.spyOn(Linking, 'openSettings').mockResolvedValue(); const adapter = new ExpoNotificationPermissionAdapter();
    await adapter.requestFromExplicitUserAction(() => true); expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled(); expect(open).not.toHaveBeenCalled();
    await adapter.openSettings(); expect(open).toHaveBeenCalledTimes(1); open.mockRestore();
  });
  it('account changed before prompt is suppressed', async () => {
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({ status: 'undetermined', granted: false, canAskAgain: true } as never);
    await expect(new ExpoNotificationPermissionAdapter().requestFromExplicitUserAction(() => false)).rejects.toMatchObject({ code: 'cancelled' });
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });
});
