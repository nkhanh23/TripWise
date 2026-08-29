import type { ResolvedImage } from '../src/integration/contracts';
import { maximumDestinationImageResults, loadDestinationImages } from '../src/features/planner/destinationImageLoader';
import type { DestinationCoverRepository } from '../src/integration/repositories';
import type { DestinationOption } from '../src/features/planner/types';

const city = (id: string): DestinationOption => ({ id, name: id, formattedAddress: 'Country', destinationType: 'CITY', imageUrl: '' });
const cover: ResolvedImage = { uri: 'https://upload.wikimedia.org/example.jpg', source: 'DESTINATION_COVER' };

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => { resolve = resolvePromise; reject = rejectPromise; });
  return { promise, resolve, reject };
}

function load(destinations: DestinationOption[], repository: DestinationCoverRepository, requestedIds = new Set<string>(), controller = new AbortController()) {
  return {
    requestedIds,
    controller,
    promise: loadDestinationImages({ destinations, repository, requestedIds, signal: controller.signal, onResolved: jest.fn() }),
  };
}

describe('destination image loader', () => {
  it('starts one request per destination while in flight and does not duplicate it on rerender', async () => {
    const pending = deferred<ResolvedImage>();
    const repository: DestinationCoverRepository = { getDestinationCover: jest.fn(() => pending.promise) };
    const requestedIds = new Set<string>();
    const first = load([city('singapore')], repository, requestedIds);
    const rerender = load([{ ...city('singapore') }], repository, requestedIds);
    expect(repository.getDestinationCover).toHaveBeenCalledTimes(1);

    pending.resolve(cover);
    await Promise.all([first.promise, rerender.promise]);
    await load([{ ...city('singapore') }], repository, requestedIds).promise;
    expect(repository.getDestinationCover).toHaveBeenCalledTimes(1);
  });

  it.each(['failure', 'abort'] as const)('allows a %s image request to retry later', async (kind) => {
    const repository: DestinationCoverRepository = {
      getDestinationCover: jest.fn().mockRejectedValueOnce(new Error(kind)).mockResolvedValueOnce({ uri: null, source: 'PLACEHOLDER' }),
    };
    const requestedIds = new Set<string>();
    await load([city('singapore')], repository, requestedIds).promise;
    await load([city('singapore')], repository, requestedIds).promise;
    expect(repository.getDestinationCover).toHaveBeenCalledTimes(2);
  });

  it('limits image work to six results and three concurrent requests', async () => {
    const pending = Array.from({ length: 6 }, () => deferred<ResolvedImage>());
    let active = 0;
    let maximumActive = 0;
    let calls = 0;
    const getDestinationCover = jest.fn(() => {
      const next = pending[calls++];
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      return next.promise.finally(() => { active -= 1; });
    });
    const repository: DestinationCoverRepository = { getDestinationCover };
    const resolution = load(Array.from({ length: 8 }, (_, index) => city(`city-${index}`)), repository);
    expect(repository.getDestinationCover).toHaveBeenCalledTimes(3);
    for (const item of pending) item.resolve(cover);
    await resolution.promise;
    expect(repository.getDestinationCover).toHaveBeenCalledTimes(maximumDestinationImageResults);
    expect(maximumActive).toBe(3);
  });
});