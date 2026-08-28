import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { CreateTripWizardScreen } from '../src/features/planner/screens/CreateTripWizardScreen';

jest.mock('../src/lib/supabase/client', () => ({ supabase: {} }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('@react-navigation/native', () => ({ ...jest.requireActual('@react-navigation/native'), useNavigation: () => ({ navigate: jest.fn(), canGoBack: () => true, goBack: jest.fn() }) }));
const tokyo = { id: 'tokyo', name: 'Tokyo', formattedAddress: 'Japan', imageUrl: '' };

describe('CreateTripWizardScreen destination search', () => {
  beforeEach(() => jest.useFakeTimers()); afterEach(() => { cleanup(); jest.useRealTimers(); });
  it('uses the exact 500ms debounce before rendering provider results', async () => {
    const search = jest.fn().mockResolvedValue([tokyo]); render(<CreateTripWizardScreen destinationSearchRepository={{ search }} />);
    fireEvent.changeText(screen.getByLabelText('Destination'), 'Tokyo');
    act(() => jest.advanceTimersByTime(499)); expect(search).not.toHaveBeenCalled();
    await act(async () => { jest.advanceTimersByTime(1); await Promise.resolve(); });
    expect(search).toHaveBeenCalledTimes(1); expect(screen.getByLabelText('Tokyo, Japan')).toBeTruthy();
  });
  it('preserves selected provider identity and query on Step 1 -> Step 2 -> Back without refetch', async () => {
    const search = jest.fn().mockResolvedValue([tokyo]); render(<CreateTripWizardScreen destinationSearchRepository={{ search }} />);
    fireEvent.changeText(screen.getByLabelText('Destination'), 'Tokyo'); await act(async () => { jest.advanceTimersByTime(500); await Promise.resolve(); });
    fireEvent.press(screen.getByLabelText('Tokyo, Japan')); fireEvent.press(screen.getByText('Continue'));
    expect(screen.getByText('Step 2 of 5')).toBeTruthy(); fireEvent.press(screen.getByLabelText('Back'));
    expect(screen.getByDisplayValue('Tokyo')).toBeTruthy(); expect(screen.getByLabelText('Tokyo, Japan').props.accessibilityState.selected).toBe(true); expect(search).toHaveBeenCalledTimes(1);
  });
  it('maps selected destination and inclusive dates to generation', async () => {
    const generate = jest.fn().mockResolvedValue({ title: 'Trip', destination: 'Tokyo', startDate: '2026-10-15', endDate: '2026-10-20', days: Array.from({ length: 6 }, (_, index) => ({ dayNumber: index + 1, date: `2026-10-${15 + index}`, items: [{ position: 1, placeName: 'Place' }] })) });
    render(<CreateTripWizardScreen initialStep={5} initialState={{ destination: tokyo, startDate: '2026-10-15', endDate: '2026-10-20', durationDays: 6 }} generationRepository={{ generate }} />);
    fireEvent.press(screen.getByText('Generate Itinerary')); await act(async () => { await Promise.resolve(); });
    expect(generate).toHaveBeenCalledWith({ destination: 'Tokyo', startDate: '2026-10-15', endDate: '2026-10-20', preferences: ['Culture & History', 'Food & Dining'], notes: 'Travel pace: moderate; budget tier: moderate; group type: couple.' }, expect.any(AbortSignal));
  });
});