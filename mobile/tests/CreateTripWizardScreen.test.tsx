import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { CreateTripWizardScreen } from '../src/features/planner/screens/CreateTripWizardScreen';

jest.mock('../src/lib/supabase/client', () => ({ supabase: {} }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('@react-navigation/native', () => ({ ...jest.requireActual('@react-navigation/native'), useNavigation: () => ({ navigate: jest.fn(), canGoBack: () => true, goBack: jest.fn() }) }));
const tokyo = { id: 'tokyo', name: 'Tokyo', formattedAddress: 'Japan', destinationType: 'CITY' as const, imageUrl: 'https://example.test/tokyo.jpg' };
async function advanceTimers(milliseconds: number) { await act(async () => { await jest.advanceTimersByTimeAsync(milliseconds); }); }
async function changeDestination(value: string) { await act(async () => { fireEvent.changeText(screen.getByLabelText('Destination'), value); await Promise.resolve(); }); }
async function press(target: ReturnType<typeof screen.getByText>) { await act(async () => { fireEvent.press(target); await Promise.resolve(); }); }

describe('CreateTripWizardScreen destination search', () => {
  beforeEach(() => jest.useFakeTimers()); afterEach(() => { cleanup(); jest.useRealTimers(); });
  it.each(['XYZ', 'usd', '', ' ', undefined, null])('blocks initial configured budget with currency %p on Step 4 and Step 5', async (currency) => {
    const generate = jest.fn();
    const initialState = { budgetAmount: '1000', budgetCurrency: currency as string };
    const view = await render(<CreateTripWizardScreen initialStep={4} initialState={initialState} generationRepository={{ generate }} />);
    await press(screen.getByText('Continue'));
    expect(screen.getByText('Step 4 of 5')).toBeTruthy();
    expect(screen.getByText('Select a supported currency for your budget.')).toBeTruthy();
    await view.unmount();
    await render(<CreateTripWizardScreen initialStep={5} initialState={initialState} generationRepository={{ generate }} />);
    await press(screen.getByText('Generate Itinerary'));
    expect(screen.getByText('Select a supported currency for your budget.')).toBeTruthy();
    expect(generate).not.toHaveBeenCalled();
  });

  it('allows an explicit canonical UI selection to repair an invalid configured currency', async () => {
    await render(<CreateTripWizardScreen initialStep={4} initialState={{ budgetAmount: '1000', budgetCurrency: 'XYZ' }} />);
    await press(screen.getByText('Continue'));
    await press(screen.getByLabelText('Budget currency JPY'));
    expect(screen.queryByText('Select a supported currency for your budget.')).toBeNull();
    expect(screen.getByDisplayValue('1000')).toBeTruthy();
    await press(screen.getByText('Continue'));
    expect(screen.getByText('Step 5 of 5')).toBeTruthy();
  });
  it('uses the exact 500ms debounce before rendering provider results', async () => {
    const search = jest.fn().mockResolvedValue([tokyo]); await render(<CreateTripWizardScreen destinationSearchRepository={{ search }} />);
    await changeDestination('Tokyo');
    await advanceTimers(499); expect(search).not.toHaveBeenCalled();
    await advanceTimers(1);
    expect(search).toHaveBeenCalledTimes(1); expect(screen.getByLabelText('Tokyo, Japan')).toBeTruthy(); expect(screen.getByLabelText('Tokyo destination image')).toBeTruthy(); expect(screen.getByText('City')).toBeTruthy();
  });
  it('shows editorial popular destinations for an empty query, hides them for provider search, and restores them when cleared', async () => {
    const search = jest.fn().mockResolvedValue([tokyo]);
    await render(<CreateTripWizardScreen destinationSearchRepository={{ search }} />);
    expect(screen.getByText('Popular destinations')).toBeTruthy();
    expect(screen.getByLabelText('Nha Trang, Khanh Hoa, Vietnam')).toBeTruthy();
    expect(screen.queryByText('Search Results')).toBeNull();

    await changeDestination('To');
    await advanceTimers(500);
    expect(search).toHaveBeenCalledWith('To', expect.any(AbortSignal));
    expect(screen.getByText('Search Results')).toBeTruthy();
    expect(screen.queryByText('Popular destinations')).toBeNull();

    await changeDestination('');
    expect(screen.getByText('Popular destinations')).toBeTruthy();
    expect(screen.getByLabelText('Nha Trang, Khanh Hoa, Vietnam')).toBeTruthy();
  });

  it('keeps a popular destination selected without starting provider autocomplete, including after Back', async () => {
    const search = jest.fn().mockResolvedValue([tokyo]);
    await render(<CreateTripWizardScreen destinationSearchRepository={{ search }} />);
    await press(screen.getByLabelText('Nha Trang, Khanh Hoa, Vietnam'));
    expect(screen.getByDisplayValue('Nha Trang')).toBeTruthy();
    expect(screen.getByLabelText('Nha Trang, Khanh Hoa, Vietnam').props.accessibilityState.selected).toBe(true);
    await advanceTimers(501);
    expect(search).not.toHaveBeenCalled();

    await press(screen.getByText('Continue'));
    expect(screen.getByText('Step 2 of 5')).toBeTruthy();
    await press(screen.getByLabelText('Back'));
    expect(screen.getByDisplayValue('Nha Trang')).toBeTruthy();
    expect(screen.getByLabelText('Nha Trang, Khanh Hoa, Vietnam').props.accessibilityState.selected).toBe(true);
    await advanceTimers(501);
    expect(search).not.toHaveBeenCalled();

    await changeDestination('To');
    await advanceTimers(500);
    expect(search).toHaveBeenCalledWith('To', expect.any(AbortSignal));
    await changeDestination('');
    expect(screen.getByText('Popular destinations')).toBeTruthy();
  });

  it('preserves selected provider identity and query on Step 1 -> Step 2 -> Back without refetch', async () => {
    const search = jest.fn().mockResolvedValue([tokyo]); await render(<CreateTripWizardScreen destinationSearchRepository={{ search }} />);
    await changeDestination('Tokyo'); await advanceTimers(500);
    await press(screen.getByLabelText('Tokyo, Japan')); await press(screen.getByText('Continue'));
    expect(screen.getByText('Step 2 of 5')).toBeTruthy(); await press(screen.getByLabelText('Back'));
    expect(screen.getByDisplayValue('Tokyo')).toBeTruthy(); expect(screen.getByLabelText('Tokyo, Japan').props.accessibilityState.selected).toBe(true); expect(search).toHaveBeenCalledTimes(1);
  });
  it('maps selected destination and inclusive dates to generation', async () => {
    const generate = jest.fn().mockResolvedValue({ title: 'Trip', destination: 'Tokyo', startDate: '2026-10-15', endDate: '2026-10-20', days: Array.from({ length: 6 }, (_, index) => ({ dayNumber: index + 1, date: `2026-10-${15 + index}`, items: [{ position: 1, placeName: 'Place' }] })) });
    await render(<CreateTripWizardScreen initialStep={5} initialState={{ destination: tokyo, startDate: '2026-10-15', endDate: '2026-10-20', durationDays: 6 }} generationRepository={{ generate }} />);
    await press(screen.getByText('Generate Itinerary'));
    expect(generate).toHaveBeenCalledWith({ destination: 'Tokyo', startDate: '2026-10-15', endDate: '2026-10-20', preferences: ['Culture & History', 'Food & Dining'], notes: 'Travel pace: moderate; budget tier: moderate; group type: couple.' }, expect.any(AbortSignal));
  });

  it('rejects malformed budget input on Step 4 and blocks proceeding to Step 5', async () => {
    await render(
      <CreateTripWizardScreen
        initialStep={4}
        initialState={{
          destination: tokyo,
          startDate: '2026-10-15',
          endDate: '2026-10-20',
          durationDays: 6,
          selectedStyles: ['culture'],
        }}
      />
    );

    expect(screen.getByText('Step 4 of 5')).toBeTruthy();
    const budgetInput = screen.getByLabelText('Target Budget');
    await act(async () => {
      fireEvent.changeText(budgetInput, '1000abc');
    });

    await press(screen.getByText('Continue'));
    // Remains on Step 4 and displays validation error
    expect(screen.getByText('Step 4 of 5')).toBeTruthy();
    expect(
      screen.getByText('Please enter a valid positive number with up to 2 decimal places.')
    ).toBeTruthy();

    // Now enter valid budget amount
    await act(async () => {
      fireEvent.changeText(budgetInput, '1500.50');
    });

    await press(screen.getByText('Continue'));
    // Successfully proceeds to Step 5
    expect(screen.getByText('Step 5 of 5')).toBeTruthy();
  });
});
