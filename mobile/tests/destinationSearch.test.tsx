import { act, cleanup, render } from '@testing-library/react-native';
import { View } from 'react-native';
import { useDestinationSearch } from '../src/features/planner/destinationSearch';
import type { DestinationSearchRepository } from '../src/integration/repositories';
import type { DestinationOption } from '../src/features/planner/types';

const tokyo: DestinationOption = { id: 'tokyo', name: 'Tokyo', formattedAddress: 'Japan', imageUrl: '' };
type SearchState = ReturnType<typeof useDestinationSearch>;
let state: SearchState;
function Harness({ repository, initialQuery = '', revision = 0 }: { repository: DestinationSearchRepository; initialQuery?: string; revision?: number }) {
  state = useDestinationSearch(repository, initialQuery);
  return <View testID={`destination-search-${revision}`} />;
}
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((res) => { resolve = res; }); return { promise, resolve }; }
async function tick(milliseconds: number) { await act(async () => { await jest.advanceTimersByTimeAsync(milliseconds); }); }
async function flush() { await act(async () => { await Promise.resolve(); await Promise.resolve(); }); }
async function setDestinationQuery(query: string) { await act(async () => { state.setQuery(query); await Promise.resolve(); }); }
async function retrySearch() { await act(async () => { state.retry(); await Promise.resolve(); }); }
function createSearch() { return jest.fn<Promise<DestinationOption[]>, [string, AbortSignal?]>(); }
function signalFrom(search: ReturnType<typeof createSearch>) { const signal = search.mock.calls[0]?.[1]; expect(signal).toBeDefined(); return signal!; }

describe('useDestinationSearch', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => { cleanup(); jest.useRealTimers(); });

  it('makes zero requests for empty or one-character queries and exactly one at 500ms', async () => {
    const search = createSearch().mockResolvedValue([tokyo]); const repository = { search };
    await render(<Harness repository={repository} />); expect(search).toHaveBeenCalledTimes(0);
    await setDestinationQuery(''); await tick(500); expect(search).toHaveBeenCalledTimes(0);
    await setDestinationQuery('T'); await tick(500); expect(search).toHaveBeenCalledTimes(0);
    await setDestinationQuery('Tokyo'); await tick(499); expect(search).toHaveBeenCalledTimes(0); await tick(1); expect(search).toHaveBeenCalledTimes(1);
  });

  it('aborts A, suppresses stale A, and starts B exactly once', async () => {
    const a = deferred<DestinationOption[]>(), b = deferred<DestinationOption[]>(); const search = createSearch().mockImplementation((query) => query === 'Tokyo' ? a.promise : b.promise); const repository = { search };
    await render(<Harness repository={repository} />); await setDestinationQuery('Tokyo'); await tick(500); const signal = signalFrom(search);
    await setDestinationQuery('Kyoto'); expect(signal.aborted).toBe(true); a.resolve([tokyo]); await flush(); expect(state.results).toEqual([]);
    await tick(500); expect(search).toHaveBeenCalledTimes(2); b.resolve([{ ...tokyo, id: 'kyoto', name: 'Kyoto' }]); await flush(); expect(state.results[0]?.name).toBe('Kyoto');
  });

  it('dedupes successful queries across stable rerenders and remounts', async () => {
    const search = createSearch().mockResolvedValue([tokyo]); const repository = { search }; const first = await render(<Harness repository={repository} initialQuery="Tokyo" />);
    await tick(500); expect(search).toHaveBeenCalledTimes(1); await first.rerender(<Harness repository={repository} initialQuery="Tokyo" revision={1} />); await tick(500); expect(search).toHaveBeenCalledTimes(1);
    await first.unmount(); await render(<Harness repository={repository} initialQuery="Tokyo" />); await tick(500); expect(search).toHaveBeenCalledTimes(1);
  });

  it('retries failed and aborted same queries after the normal debounce', async () => {
    const first = deferred<DestinationOption[]>(); const search = createSearch().mockReturnValueOnce(first.promise).mockRejectedValueOnce(new Error('provider')).mockResolvedValueOnce([tokyo]); const repository = { search };
    await render(<Harness repository={repository} />); await setDestinationQuery('Tokyo'); await tick(500); const signal = signalFrom(search);
    await setDestinationQuery('T'); expect(signal.aborted).toBe(true); await setDestinationQuery('Tokyo'); await tick(500); expect(search).toHaveBeenCalledTimes(2);
    await flush(); expect(state.results).toEqual([]); await retrySearch(); await tick(499); expect(search).toHaveBeenCalledTimes(2); await tick(1); expect(search).toHaveBeenCalledTimes(3); expect(state.results).toEqual([tokyo]);
  });

  it('keeps only the bounded successful cache and does not invent fallback results', async () => {
    const search = createSearch().mockResolvedValue([tokyo]); const repository = { search }; await render(<Harness repository={repository} />);
    for (let index = 0; index < 21; index += 1) { await setDestinationQuery(`City ${index}`); await tick(500); }
    expect(search).toHaveBeenCalledTimes(21); await setDestinationQuery('City 0'); await tick(500); expect(search).toHaveBeenCalledTimes(22); expect(state.results).toEqual([tokyo]);
  });
});