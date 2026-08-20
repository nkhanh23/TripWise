import { cleanup, render, screen, userEvent } from '@testing-library/react-native';
import { CreateTripWizardScreen } from '../src/features/planner/screens/CreateTripWizardScreen';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 0, left: 0, right: 0 }),
}));

const mockNavigate = jest.fn();
const mockCanGoBack = jest.fn().mockReturnValue(true);
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    canGoBack: mockCanGoBack,
    goBack: mockGoBack,
  }),
}));

describe('CreateTripWizardScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders Step 1 (Destination) with search bar and popular destinations', async () => {
    await render(<CreateTripWizardScreen initialStep={1} />);

    expect(screen.getByText('Step 1 of 5')).toBeTruthy();
    expect(screen.getByText('Where are you going?')).toBeTruthy();
    expect(screen.getByPlaceholderText('Search city, e.g. Bangkok, Tokyo...')).toBeTruthy();
    expect(screen.getByText('Popular Destinations')).toBeTruthy();
    expect(screen.getByText('Bangkok')).toBeTruthy();
    expect(screen.getByText('Continue')).toBeTruthy();
  });

  it('filters destinations based on search query', async () => {
    const user = userEvent.setup();
    await render(<CreateTripWizardScreen initialStep={1} />);

    const searchInput = screen.getByPlaceholderText('Search city, e.g. Bangkok, Tokyo...');
    await user.clear(searchInput);
    await user.type(searchInput, 'Tokyo');

    expect(screen.getByText('Tokyo')).toBeTruthy();
    expect(screen.queryByText('Da Nang')).toBeNull();
  });

  it('shows validation error if destination is cleared and user clicks continue', async () => {
    const user = userEvent.setup();
    await render(<CreateTripWizardScreen initialStep={1} />);

    // Clear destination
    const clearBtn = screen.getByLabelText('Xóa điểm đến');
    await user.press(clearBtn);

    // Attempt continue
    await user.press(screen.getByLabelText('Tiếp tục'));

    expect(screen.getByText('Vui lòng chọn hoặc nhập điểm đến của chuyến đi.')).toBeTruthy();
  });

  it('navigates from Step 1 to Step 2 (Dates) and maintains state on back', async () => {
    const user = userEvent.setup();
    await render(<CreateTripWizardScreen initialStep={1} />);

    // Clear and Select Tokyo
    const searchInput = screen.getByPlaceholderText('Search city, e.g. Bangkok, Tokyo...');
    await user.clear(searchInput);
    await user.type(searchInput, 'Tokyo');
    await user.press(screen.getByLabelText('Tokyo, Japan'));

    // Press Continue
    await user.press(screen.getByLabelText('Tiếp tục'));

    // Step 2 rendered
    expect(screen.getByText('Step 2 of 5')).toBeTruthy();
    expect(screen.getByText('When is your trip?')).toBeTruthy();
    expect(screen.getByText('Quick Durations')).toBeTruthy();
    expect(screen.getByText('3 days (Weekend)')).toBeTruthy();
    expect(screen.getByText('5 days')).toBeTruthy();

    // Go back to Step 1
    await user.press(screen.getByLabelText('Quay lại bước trước'));

    // Step 1 rendered with Tokyo still selected
    expect(screen.getByText('Step 1 of 5')).toBeTruthy();
    expect(screen.getByDisplayValue('Tokyo')).toBeTruthy();
  });

  it('updates duration in Step 2 when quick duration chip is selected', async () => {
    const user = userEvent.setup();
    await render(<CreateTripWizardScreen initialStep={2} />);

    expect(screen.getByText('Step 2 of 5')).toBeTruthy();

    // Select 7 days (1 Week)
    await user.press(screen.getByLabelText('7 days (1 Week)'));

    expect(screen.getByText('7 Days')).toBeTruthy();
  });

  it('renders Step 3 (Preferences) and toggles style interests and pace', async () => {
    const user = userEvent.setup();
    await render(<CreateTripWizardScreen initialStep={3} />);

    expect(screen.getByText('Step 3 of 5')).toBeTruthy();
    expect(screen.getByText('What are your interests?')).toBeTruthy();
    expect(screen.getByText('Culture & History')).toBeTruthy();
    expect(screen.getByText('Food & Dining')).toBeTruthy();
    expect(screen.getByText('Trip Pace')).toBeTruthy();

    // Toggle Nature & Outdoors
    await user.press(screen.getByLabelText('Nature & Outdoors'));
    expect(screen.getByText('3 selected')).toBeTruthy();

    // Select Fast-Paced pace
    await user.press(screen.getByLabelText('Fast-Paced, 6+ places / day'));
    expect(screen.getByText('Fast-Paced')).toBeTruthy();
  });

  it('renders Step 4 (Budget & Group) and selects tier & group', async () => {
    const user = userEvent.setup();
    await render(<CreateTripWizardScreen initialStep={4} />);

    expect(screen.getByText('Step 4 of 5')).toBeTruthy();
    expect(screen.getByText('Budget & Group size')).toBeTruthy();
    expect(screen.getByText('Budget Level')).toBeTruthy();
    expect(screen.getByText('Luxury')).toBeTruthy();

    // Select Luxury
    await user.press(screen.getByLabelText('Luxury, $150+/day'));

    // Select Friends group
    await user.press(screen.getByLabelText('Friends, 3+ travelers'));
  });

  it('renders Step 5 (Summary) with editable trip name and generates trip with simulated success', async () => {
    const user = userEvent.setup();
    const onCompleteMock = jest.fn();

    await render(
      <CreateTripWizardScreen
        initialStep={5}
        onComplete={onCompleteMock}
        simulationDelayMs={0}
      />
    );

    expect(screen.getByText('Step 5 of 5')).toBeTruthy();
    expect(screen.getByText('Review & Generate')).toBeTruthy();
    expect(screen.getByText('Trip Name')).toBeTruthy();
    expect(screen.getByText('Generate Itinerary')).toBeTruthy();

    // Edit Trip Title
    const titleInput = screen.getByDisplayValue('Bangkok Exploration 2026');
    await user.clear(titleInput);
    await user.type(titleInput, 'My Dream Bangkok Trip');

    // Click Generate Itinerary
    await user.press(screen.getByLabelText('Tạo lịch trình chuyến đi'));

    // Success Screen rendered matching Stitch
    expect(screen.getByText('Your Bangkok trip is ready')).toBeTruthy();
    expect(screen.getByText('Start adding places or explore recommendations.')).toBeTruthy();
    expect(screen.getByText('Plan my trip')).toBeTruthy();
    expect(screen.getByText('Explore places')).toBeTruthy();
    expect(onCompleteMock).toHaveBeenCalledTimes(1);

    // Click Plan my trip CTA
    await user.press(screen.getByLabelText('Lập kế hoạch chuyến đi'));
    expect(mockNavigate).toHaveBeenCalledWith('MainTabs');
  });
});
