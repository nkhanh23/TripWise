import { cleanup, render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { largeMockExplorePlaces, mockExplorePlaces } from '../src/features/explore/data/mockPlaces';
import { ExploreScreen } from '../src/features/explore/ExploreScreen';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 0, left: 0, right: 0 }),
}));

describe('ExploreScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders explore screen with map canvas, search bar, category chips, and markers', async () => {
    await render(<ExploreScreen />);

    // Search bar
    expect(screen.getByPlaceholderText('Search Tokyo, Bangkok...')).toBeTruthy();

    // Category chips
    expect(screen.getByText('All')).toBeTruthy();
    expect(screen.getByText('Attractions')).toBeTruthy();
    expect(screen.getByText('Restaurants')).toBeTruthy();
    expect(screen.getByText('Hotels')).toBeTruthy();
    expect(screen.getByText('Coffee')).toBeTruthy();
    expect(screen.getByText('Shopping')).toBeTruthy();

    // Map canvas
    expect(screen.getByLabelText(/Interactive Map|Bản đồ tương tác/)).toBeTruthy();

    // Markers
    expect(screen.getByLabelText('Wat Arun')).toBeTruthy();
    expect(screen.getByLabelText('The Grand Palace')).toBeTruthy();
    expect(screen.getByLabelText('Blue Whale Cafe')).toBeTruthy();

    // View toggle
    expect(screen.getByText('List')).toBeTruthy();
  });

  it('filters places by category chip selection', async () => {
    const user = userEvent.setup();
    await render(<ExploreScreen />);

    // Initially multiple categories exist
    expect(screen.getByLabelText('Wat Arun')).toBeTruthy();
    expect(screen.getByLabelText('Blue Whale Cafe')).toBeTruthy();

    // Click "Coffee" category chip
    await user.press(screen.getByLabelText('Coffee'));

    // Coffee places should exist
    expect(screen.getByLabelText('Blue Whale Cafe')).toBeTruthy();
    expect(screen.getByLabelText('Factory Coffee')).toBeTruthy();

    // Non-coffee places should not exist
    expect(screen.queryByLabelText('Wat Arun')).toBeNull();
    expect(screen.queryByLabelText('The Grand Palace')).toBeNull();
  });

  it('filters places by search query', async () => {
    const user = userEvent.setup();
    await render(<ExploreScreen />);

    await user.type(screen.getByPlaceholderText('Search Tokyo, Bangkok...'), 'Pad Thai');

    // Only Thip Samai Pad Thai should match
    expect(screen.getByLabelText('Thip Samai Pad Thai')).toBeTruthy();
    expect(screen.queryByLabelText('Wat Arun')).toBeNull();
  });

  it('displays empty state when search query matches no places and clears filters on reset', async () => {
    const user = userEvent.setup();
    await render(<ExploreScreen />);

    await user.type(screen.getByPlaceholderText('Search Tokyo, Bangkok...'), 'NonExistentPlaceXYZ');

    expect(screen.getByText('No places found')).toBeTruthy();
    expect(screen.getByText('Clear filters')).toBeTruthy();

    await user.press(screen.getByText('Clear filters'));

    expect(screen.queryByText('No places found')).toBeNull();
    expect(screen.getByLabelText('Wat Arun')).toBeTruthy();
  });

  it('shows place preview bottom sheet when a marker is pressed', async () => {
    const user = userEvent.setup();
    await render(<ExploreScreen />);

    // Initially preview is closed
    expect(screen.queryByText('Bangkok Yai, Bangkok')).toBeNull();

    // Press Wat Arun marker
    await user.press(screen.getByLabelText('Wat Arun'));

    // Preview appears (Wat Arun appears in both marker badge and preview header)
    expect(screen.getAllByText('Wat Arun')).toHaveLength(2);
    expect(screen.getByText('Buddhist Temple')).toBeTruthy();
    expect(screen.getByText('Bangkok Yai, Bangkok')).toBeTruthy();
    expect(screen.getByText('Open • Closes 6 PM')).toBeTruthy();
    expect(screen.getByText('Directions')).toBeTruthy();
    expect(screen.getByText('Save')).toBeTruthy();
  });

  it('switches preview to new place when another marker is pressed', async () => {
    const user = userEvent.setup();
    await render(<ExploreScreen />);

    // Select Wat Arun
    await user.press(screen.getByLabelText('Wat Arun'));
    expect(screen.getByText('Buddhist Temple')).toBeTruthy();

    // Select Blue Whale Cafe
    await user.press(screen.getByLabelText('Blue Whale Cafe'));
    expect(screen.getByText('Specialty Coffee')).toBeTruthy();
  });

  it('closes place preview when close button is pressed', async () => {
    const user = userEvent.setup();
    await render(<ExploreScreen />);

    await user.press(screen.getByLabelText('Wat Arun'));
    expect(screen.getByText('Bangkok Yai, Bangkok')).toBeTruthy();

    await user.press(screen.getByLabelText('Đóng'));
    expect(screen.queryByText('Bangkok Yai, Bangkok')).toBeNull();
  });

  it('toggles between Map and List view modes', async () => {
    const user = userEvent.setup();
    await render(<ExploreScreen />);

    // Initial is Map view
    expect(screen.getByLabelText(/Interactive Map|Bản đồ tương tác/)).toBeTruthy();
    expect(screen.getByText('List')).toBeTruthy();

    // Switch to List view
    await user.press(screen.getByLabelText('Chuyển sang chế độ danh sách'));

    // Map canvas disappears, FlatList rows appear
    expect(screen.queryByLabelText(/Interactive Map|Bản đồ tương tác/)).toBeNull();
    expect(screen.getByText('Wat Arun')).toBeTruthy();
    expect(screen.getByText('The Grand Palace')).toBeTruthy();
    expect(screen.getByText('Map')).toBeTruthy();

    // Switch back to Map view
    await user.press(screen.getByLabelText('Chuyển sang chế độ bản đồ'));
    expect(screen.getByLabelText(/Interactive Map|Bản đồ tương tác/)).toBeTruthy();
  });

  it('synchronizes selection between List and Map modes', async () => {
    const user = userEvent.setup();
    await render(<ExploreScreen />);

    // Switch to List mode
    await user.press(screen.getByLabelText('Chuyển sang chế độ danh sách'));

    // Select Wat Arun row in List mode
    await user.press(screen.getByLabelText('Wat Arun, Buddhist Temple, đánh giá 4.8 sao'));

    // Preview bottom sheet opens (address appears in list item and preview sheet)
    expect(screen.getAllByText('Bangkok Yai, Bangkok').length).toBeGreaterThanOrEqual(1);

    // Switch back to Map mode
    await user.press(screen.getByLabelText('Chuyển sang chế độ bản đồ'));

    // Wat Arun marker and preview remain active
    expect(screen.getAllByText('Wat Arun').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('Bangkok Yai, Bangkok').length).toBeGreaterThanOrEqual(1);
  });

  it('filters results in List mode with search query and category chips', async () => {
    const user = userEvent.setup();
    await render(<ExploreScreen />);

    // Switch to List mode
    await user.press(screen.getByLabelText('Chuyển sang chế độ danh sách'));

    // Filter by Coffee category
    await user.press(screen.getByLabelText('Coffee'));
    expect(screen.getByText('Blue Whale Cafe')).toBeTruthy();
    expect(screen.getByText('Factory Coffee')).toBeTruthy();
    expect(screen.queryByText('Wat Arun')).toBeNull();

    // Type search query
    await user.type(screen.getByPlaceholderText('Search Tokyo, Bangkok...'), 'Factory');
    expect(screen.getByText('Factory Coffee')).toBeTruthy();
    expect(screen.queryByText('Blue Whale Cafe')).toBeNull();
  });

  it('renders large fixture with 50 places in virtualized list mode', async () => {
    const user = userEvent.setup();
    await render(<ExploreScreen initialPlaces={largeMockExplorePlaces} />);

    // Switch to List mode
    await user.press(screen.getByLabelText('Chuyển sang chế độ danh sách'));

    // First items render cleanly
    expect(screen.getByText('Wat Arun')).toBeTruthy();
    expect(screen.getByText('The Grand Palace')).toBeTruthy();

    // Filter across large fixture
    await user.type(screen.getByPlaceholderText('Search Tokyo, Bangkok...'), 'Sukhumvit');
    expect(screen.getAllByText(/Sukhumvit/).length).toBeGreaterThan(0);
  });

  it('renders cluster markers for dense places on map and allows selection', async () => {
    const user = userEvent.setup();
    await render(<ExploreScreen initialPlaces={largeMockExplorePlaces} />);

    // Canvas is rendered
    expect(screen.getByLabelText(/Interactive Map|Bản đồ tương tác/)).toBeTruthy();

    // Find any cluster marker with count label
    const clusterMarkers = screen.queryAllByLabelText(/địa điểm trong khu vực này/);
    expect(clusterMarkers.length).toBeGreaterThan(0);

    // Press cluster marker
    await user.press(clusterMarkers[0]);

    // Preview sheet opens for the cluster's place
    expect(screen.getByText('Directions')).toBeTruthy();
    expect(screen.getByText('Save')).toBeTruthy();
  });

  it('renders loading overlay when initialStatus is loading', async () => {
    await render(<ExploreScreen initialStatus="loading" />);

    expect(screen.getByLabelText('Đang tải dữ liệu bản đồ')).toBeTruthy();
  });

  it('renders error state and recovers on retry', async () => {
    const user = userEvent.setup();
    await render(<ExploreScreen initialStatus="error" />);

    expect(screen.getByText('Unable to load map')).toBeTruthy();
    expect(screen.getByText('Retry')).toBeTruthy();

    await user.press(screen.getByText('Retry'));

    await waitFor(() => {
      expect(screen.queryByText('Unable to load map')).toBeNull();
    });
    expect(screen.getByLabelText('Wat Arun')).toBeTruthy();
  });
});
