import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SettingsScreen } from '../src/features/settings/screens/SettingsScreen';
import { useNotificationPolicyController } from '../src/features/settings/hooks/useNotificationPolicyController';
import { ThemeProvider } from '../src/theme';
import { TranslationProvider } from '../src/i18n';

jest.mock('../src/features/settings/hooks/useNotificationPolicyController', () => ({ useNotificationPolicyController: jest.fn() }));
jest.mock('../src/features/auth/AuthProvider', () => ({ useAuth: () => ({ signOut: jest.fn(), deleteAccount: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
const on = jest.fn(); const off = jest.fn(); const settings = jest.fn(); const retry = jest.fn();
function setup(permission = 'granted', error: string | null = null) {
  jest.mocked(useNotificationPolicyController).mockReturnValue({
    session: {}, loading: false, busy: false, stale: false, permission, error,
    intent: { tripReminders: false, itineraryReminders: true },
    policy: { canSchedule: permission === 'granted' },
    setTripReminders: on, setItineraryReminders: off, openSystemSettings: settings, retry,
  } as never);
}
async function show(locale: 'en' | 'vi' = 'en', theme: 'light' | 'dark' = 'light') {
  await render(<ThemeProvider initialPreference={theme}><TranslationProvider initialLocale={locale}>
    <SettingsScreen navigation={{ goBack: jest.fn(), navigate: jest.fn() } as never} route={{} as never} />
  </TranslationProvider></ThemeProvider>);
}
describe('T003 Settings intent and explicit actions', () => {
  beforeEach(() => { jest.clearAllMocks(); setup(); });
  it('mount does not enable, revoke, open settings or retry; switches dispatch explicit intent', async () => {
    await show(); expect(on).not.toHaveBeenCalled(); expect(off).not.toHaveBeenCalled(); expect(settings).not.toHaveBeenCalled(); expect(retry).not.toHaveBeenCalled();
    await fireEvent(screen.getByLabelText('Trip reminders'), 'valueChange', true);
    await fireEvent(screen.getByLabelText('Itinerary reminders'), 'valueChange', false);
    expect(on).toHaveBeenCalledWith(true); expect(off).toHaveBeenCalledWith(false);
  });
  it('denial preserves intent switch without claiming effective grant', async () => {
    setup('denied_requestable'); await show();
    expect(screen.getByLabelText('Itinerary reminders').props.value).toBe(true);
    expect(screen.getByText(/Permission denied/)).toBeTruthy();
  });
  it('blocked permission exposes only an explicit system-settings action', async () => {
    setup('denied_blocked'); await show(); expect(settings).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByText('Open notification settings')); expect(settings).toHaveBeenCalledTimes(1);
  });
  it.each([['en', 'light'], ['en', 'dark'], ['vi', 'light'], ['vi', 'dark']] as const)('sync failure offers localized retry in %s/%s', async (locale, theme) => {
    setup('granted', 'sync'); await show(locale, theme);
    await fireEvent.press(screen.getByText(locale === 'en' ? 'Retry notification update' : 'Thử cập nhật thông báo lại'));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
