import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';

import type { DestinationCoverRepository } from '../src/integration/repositories';
import { StepDestination } from '../src/features/planner/components/StepDestination';
import { useDestinationSearch } from '../src/features/planner/destinationSearch';

jest.mock('../src/lib/supabase/client', () => ({ supabase: {} }));
jest.mock('../src/features/planner/destinationSearch', () => ({ useDestinationSearch: jest.fn() }));

const mockedUseDestinationSearch = jest.mocked(useDestinationSearch);
const destination = { id: 'vietnam', name: 'Vietnam', formattedAddress: 'Vietnam', destinationType: 'COUNTRY' as const, imageUrl: '' };

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => { resolve = resolvePromise; });
  return { promise, resolve };
}

describe('StepDestination image attribution', () => {
  beforeEach(() => {
    mockedUseDestinationSearch.mockReturnValue({ query: 'Vietnam', setQuery: jest.fn(), results: [destination], loading: false, error: null, retry: jest.fn() });
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  });

  afterEach(() => { cleanup(); jest.restoreAllMocks(); });

  it('renders destination-cover attribution, omits it for the initial neutral placeholder, and keeps destination selection isolated', async () => {
    const pending = deferred<{ uri: string; source: 'DESTINATION_COVER'; attribution: { displayName: string; sourceUrl: string; license: string; licenseUrl: string } }>();
    const imageRepository: DestinationCoverRepository = { getDestinationCover: jest.fn(() => pending.promise) };
    const onSelectDestination = jest.fn();
    const screen = await render(
      <StepDestination
        customDestinationName="Vietnam"
        destinationImageRepository={imageRepository}
        onChangeCustomName={jest.fn()}
        onSelectDestination={onSelectDestination}
        repository={{ search: jest.fn() }}
        selectedDestination={null}
      />,
    );
    await waitFor(() => expect(imageRepository.getDestinationCover).toHaveBeenCalledTimes(1));
    expect(screen.getByLabelText('Destination image unavailable')).toBeTruthy();
    expect(screen.queryByLabelText(/Photo credit:/)).toBeNull();

    await act(async () => {
      pending.resolve({
        uri: 'https://upload.wikimedia.org/vietnam.jpg', source: 'DESTINATION_COVER',
        attribution: { displayName: 'Example Creator', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Vietnam.jpg', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/' },
      });
      await pending.promise;
      await Promise.resolve();
      await Promise.resolve();
    });

    const attributionLabel = 'Photo credit: Example Creator · CC BY-SA 4.0';
    expect(screen.getByLabelText(attributionLabel)).toBeTruthy();
    expect(screen.getByText('Example Creator · CC BY-SA 4.0')).toBeTruthy();
    fireEvent.press(screen.getByLabelText(attributionLabel));
    expect(Linking.openURL).toHaveBeenCalledWith('https://commons.wikimedia.org/wiki/File:Vietnam.jpg');
    expect(onSelectDestination).not.toHaveBeenCalled();
    fireEvent.press(screen.getByLabelText('Vietnam, Vietnam'));
    expect(onSelectDestination).toHaveBeenCalledWith(destination);
  });
});