import { cleanup, render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { TWPlaceCard } from '../src/features/place/components/TWPlaceCard';
import * as placeDetailFixtures from '../src/features/place/data/mockPlaceDetail';
import { PlaceDetailScreen } from '../src/features/place/screens/PlaceDetailScreen';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 0, left: 0, right: 0 }),
}));

describe('PlaceDetailScreen', () => {
  const mockNavigation: any = {
    goBack: jest.fn(),
    canGoBack: jest.fn().mockReturnValue(true),
    navigate: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders place details with title, rating, tags, gallery, about, opening hours, tickets, and reviews', async () => {
    const route: any = {
      params: { placeId: 'place_wat_arun' },
    };

    await render(<PlaceDetailScreen fixtureMode navigation={mockNavigation} route={route} />);

    // Header title
    expect(screen.getByText('Wat Arun')).toBeTruthy();
    expect(screen.getByText('4.8')).toBeTruthy();
    expect(screen.getByText('Riverside Temple of Dawn')).toBeTruthy();

    // Tags
    expect(screen.getByText('Historic')).toBeTruthy();
    expect(screen.getByText('Temple')).toBeTruthy();
    expect(screen.getByText('Photogenic')).toBeTruthy();

    // Quick Actions
    expect(screen.getByText('Route')).toBeTruthy();
    expect(screen.getByText('Website')).toBeTruthy();
    expect(screen.getByText('Call')).toBeTruthy();
    expect(screen.getByText('Add')).toBeTruthy();

    // About Section
    expect(screen.getByText('About')).toBeTruthy();
    expect(screen.getByText(/landmark Buddhist temple on the west bank/)).toBeTruthy();
    expect(screen.getByText('Read more')).toBeTruthy();

    // Details Grid
    expect(screen.getByText('Opening Hours')).toBeTruthy();
    expect(screen.getByText('Open today • Closes 6 PM')).toBeTruthy();
    expect(screen.getByText('Closes in 3 hours')).toBeTruthy();
    expect(screen.getByText('Entry Fee')).toBeTruthy();
    expect(screen.getByText('100 THB per foreigner')).toBeTruthy();

    // Location
    expect(screen.getByText('Location')).toBeTruthy();
    expect(screen.getByText(/158 Thanon Wang Doem/)).toBeTruthy();

    // Reviews
    expect(screen.getByText('Reviews')).toBeTruthy();
    expect(screen.getByText('See all (12,450)')).toBeTruthy();
    expect(screen.getByText('Sarah Jenkins')).toBeTruthy();
    expect(screen.getByText(/Highly recommend going near sunset/)).toBeTruthy();

    // Fixed CTA
    expect(screen.getByText('Get Directions')).toBeTruthy();
  });

  it('toggles bookmark / save local visual state', async () => {
    const user = userEvent.setup();
    const route: any = {
      params: { placeId: 'place_wat_arun' },
    };

    await render(<PlaceDetailScreen fixtureMode navigation={mockNavigation} route={route} />);

    const saveButton = screen.getByLabelText('Lưu địa điểm');
    expect(saveButton).toBeTruthy();

    // Press save
    await user.press(saveButton);

    // Label changes to saved
    expect(screen.getByLabelText('Đã lưu địa điểm')).toBeTruthy();

    // Press again to unsave
    await user.press(screen.getByLabelText('Đã lưu địa điểm'));
    expect(screen.getByLabelText('Lưu địa điểm')).toBeTruthy();
  });

  it('triggers navigation goBack when back button is pressed', async () => {
    const user = userEvent.setup();
    const route: any = {
      params: { placeId: 'place_wat_arun' },
    };

    await render(<PlaceDetailScreen fixtureMode navigation={mockNavigation} route={route} />);

    await user.press(screen.getByLabelText('Back'));

    expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
  });

  it('renders place not found fallback when placeId does not exist', async () => {
    const user = userEvent.setup();
    const route: any = {
      params: { placeId: 'unknown_place_xyz' },
    };

    await render(<PlaceDetailScreen navigation={mockNavigation} route={route} />);

    expect(screen.getByText('Place not found')).toBeTruthy();
    expect(screen.getByText('The requested place does not exist in our directory.')).toBeTruthy();

    await user.press(screen.getByLabelText('Back'));
    expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
  });

  it('renders loading overlay when initialStatus is loading', async () => {
    const route: any = {
      params: { placeId: 'place_wat_arun' },
    };

    await render(
      <PlaceDetailScreen initialStatus="loading" navigation={mockNavigation} route={route} />
    );

    expect(screen.getByLabelText('Loading…')).toBeTruthy();
  });

  it('renders error state and recovers on retry', async () => {
    const user = userEvent.setup();
    const route: any = {
      params: { placeId: 'place_wat_arun' },
    };

    await render(
      <PlaceDetailScreen fixtureMode initialStatus="error" navigation={mockNavigation} route={route} />
    );

    expect(screen.getByText('Unable to load place details')).toBeTruthy();
    expect(screen.getByText('Retry')).toBeTruthy();

    await user.press(screen.getByText('Retry'));

    await waitFor(() => {
      expect(screen.queryByText('Unable to load place details')).toBeNull();
    });
    expect(screen.getByText('Wat Arun')).toBeTruthy();
  });

  it('toggles read more / show less in about section', async () => {
    const user = userEvent.setup();
    const route: any = {
      params: { placeId: 'place_wat_arun' },
    };

    await render(<PlaceDetailScreen fixtureMode navigation={mockNavigation} route={route} />);

    expect(screen.getByText('Read more')).toBeTruthy();

    await user.press(screen.getByLabelText('Xem thêm'));
    expect(screen.getByText('Show less')).toBeTruthy();

    await user.press(screen.getByLabelText('Thu gọn'));
    expect(screen.getByText('Read more')).toBeTruthy();
  });

  it('renders TWPlaceCard component and handles press callback', async () => {
    const user = userEvent.setup();
    const place = placeDetailFixtures.getMockPlaceDetail('place_grand_palace')!;
    const onPressMock = jest.fn();

    await render(<TWPlaceCard onPress={onPressMock} place={place} />);

    expect(screen.getByText('The Grand Palace')).toBeTruthy();
    expect(screen.getByText('Historical Landmark')).toBeTruthy();
    expect(screen.getByText('4.7')).toBeTruthy();
    expect(screen.getByText('Open today • Closes 3:30 PM')).toBeTruthy();

    await user.press(screen.getByLabelText('The Grand Palace, Historical Landmark, đánh giá 4.7 sao'));
    expect(onPressMock).toHaveBeenCalledWith('place_grand_palace');
  });

  it('navigates to RoutePreview when Get Directions is pressed', async () => {
    const user = userEvent.setup();
    const route: any = {
      params: { placeId: 'place_wat_arun' },
    };

    await render(<PlaceDetailScreen fixtureMode navigation={mockNavigation} route={route} />);

    await user.press(screen.getByText('Get Directions'));

    expect(mockNavigation.navigate).toHaveBeenCalledWith('RoutePreview', {
      destinationId: 'place_wat_arun',
      destinationName: 'Wat Arun',
    });
  });

  it('gives immediate unavailable feedback for unsupported place actions', async () => {
    const user = userEvent.setup();
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const route: any = { params: { placeId: 'place_wat_arun' } };
    await render(<PlaceDetailScreen fixtureMode navigation={mockNavigation} route={route} />);

    for (const label of ['Trang web', 'Gọi điện', 'Thêm vào chuyến đi', 'Chia sẻ']) {
      await user.press(screen.getByLabelText(label));
    }

    expect(alert).toHaveBeenCalledTimes(4);
    expect(alert).toHaveBeenLastCalledWith('Action unavailable', 'This action is not available yet.');
  });

  it('does not resolve fixture details for a production place identity', async () => {
    const route: any = { params: { placeId: '1e9a8320-2222-4fcc-9999-999999999999' } };
    const getMockPlaceDetailSpy = jest.spyOn(placeDetailFixtures, 'getMockPlaceDetail');

    await render(<PlaceDetailScreen navigation={mockNavigation} route={route} />);

    expect(getMockPlaceDetailSpy).not.toHaveBeenCalled();
    expect(screen.getByText('Place not found')).toBeTruthy();
    expect(screen.queryByText('Sarah Jenkins')).toBeNull();
    expect(screen.queryByText('100 THB per foreigner')).toBeNull();
  });
});
