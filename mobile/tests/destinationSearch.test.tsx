import { act, render } from '@testing-library/react-native';
import { View } from 'react-native';
import { useDestinationSearch } from '../src/features/planner/destinationSearch';
import type { DestinationSearchRepository } from '../src/integration/repositories';

const tokyo = { id: 'tokyo', name: 'Tokyo', formattedAddress: 'Japan', imageUrl: '' };
type SearchState = ReturnType<typeof useDestinationSearch>;
let state: SearchState;
function Harness({ repository, initialQuery = '', revision = 0 }: { repository: DestinationSearchRepository; initialQuery?: string; revision?: number }) {
  state = useDestinationSearch(repository, initialQuery);
  return <View testID={`destination-search-${revision}`} />;
}
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((res) => { resolve = res; }); return { promise, resolve }; }
function tick(milliseconds: number) { act(() => { jest.advanceTimersByTime(milliseconds); }); }
async function flush() { await act(async () => { await Promise.resolve(); }); }

describe('useDestinationSearch', () => {
  beforeEach(() => jest.useFakeTimers({ legacyFakeTimers: true }));
  afterEach(() => jest.useRealTimers());
  it('debounces valid input and ignores empty and short input', async () => {
    const search = jest.fn().mockResolvedValue([tokyo]); const repository = { search };
    await render(<Harness repository={repository} />); expect(search).toHaveBeenCalledTimes(0);
    act(() => state.setQuery('T')); tick(500); expect(search).toHaveBeenCalledTimes(0);
    act(() => state.setQuery('Tokyo')); tick(499); expect(search).toHaveBeenCalledTimes(0); tick(1); expect(search).toHaveBeenCalledTimes(1); await flush();
  });
  it('aborts A, suppresses stale A, and starts B once', async () => {
    const a = deferred<typeof tokyo[]>(), b = deferred<typeof tokyo[]>(); const search = jest.fn((query: string) => query === 'Tokyo' ? a.promise : b.promise); const repository = { search };
    await render(<Harness repository={repository} />); act(() => state.setQuery('Tokyo')); tick(500); const signal = search.mock.calls[0][1] as AbortSignal;
    act(() => state.setQuery('Kyoto')); expect(signal.aborted).toBe(true); a.resolve([tokyo]); await flush(); expect(state.results).toEqual([]);
    tick(500); expect(search).toHaveBeenCalledTimes(2); b.resolve([{ ...tokyo, id: 'kyoto', name: 'Kyoto' }]); await flush(); expect(state.results[0].name).toBe('Kyoto');
  });
  it('dedupes a successful query across remount', async () => {
    const search = jest.fn().mockResolvedValue([tokyo]); const repository = { search }; const first = await render(<Harness repository={repository} initialQuery="Tokyo" />);
    tick(500); await flush(); expect(search).toHaveBeenCalledTimes(1); first.unmount(); await render(<Harness repository={repository} initialQuery="Tokyo" />); tick(500); expect(search).toHaveBeenCalledTimes(1);
  });
  it('retries failed same query only after the normal debounce', async () => {
    const search = jest.fn().mockRejectedValueOnce(new Error('provider')).mockResolvedValueOnce([tokyo]); const repository = { search };
    await render(<Harness repository={repository} />); act(() => state.setQuery('Tokyo')); tick(500); await flush(); expect(state.results).toEqual([]);
    act(() => state.retry()); tick(499); expect(search).toHaveBeenCalledTimes(1); tick(1); await flush(); expect(search).toHaveBeenCalledTimes(2); expect(state.results).toEqual([tokyo]);
  });
  it('allows an aborted same query to be requested again', async () => {
    const pending = deferred<typeof tokyo[]>(); const search = jest.fn().mockReturnValueOnce(pending.promise).mockResolvedValueOnce([tokyo]); const repository = { search };
    await render(<Harness repository={repository} />); act(() => state.setQuery('Tokyo')); tick(500); const signal = search.mock.calls[0][1] as AbortSignal;
    act(() => state.setQuery('T')); expect(signal.aborted).toBe(true); act(() => state.setQuery('Tokyo')); tick(500); expect(search).toHaveBeenCalledTimes(2);
  });
});