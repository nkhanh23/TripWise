import { act, renderHook } from '@testing-library/react-native';
import { Animated } from 'react-native';

import { useTripGeneration } from '../../generation';
import { useTripPersistence } from '../../persistence';
import { LIFECYCLE_BOUNDARIES } from '../timeline';
import { useTripLifecycleCoordinator } from '../useTripLifecycleCoordinator';

jest.mock('../../generation', () => ({ useTripGeneration: jest.fn() }));
jest.mock('../../persistence', () => ({ useTripPersistence: jest.fn() }));

type Completion = () => void;
let animations: { toValue: number; complete: Completion }[] = [];

jest.spyOn(Animated, 'timing').mockImplementation((_value, config) => ({
  start: (callback?: (result: { finished: boolean }) => void) => {
    animations.push({
      toValue: (config as { toValue: number }).toValue,
      complete: () => callback?.({ finished: true }),
    });
  },
  stop: jest.fn(),
  reset: jest.fn(),
}) as never);

const preview = { id: 'draft-1' } as any;
const wizard = { tripTitle: 'Title' } as any;
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
};
const completeNext = async () => {
  const next = animations.shift();
  expect(next).toBeDefined();
  await act(() => next?.complete());
  return next?.toValue;
};

describe('useTripLifecycleCoordinator MOTION-T002', () => {
  let generate: jest.Mock;
  let generationRetry: jest.Mock;
  let save: jest.Mock;
  let saveRetry: jest.Mock;
  let genState: any;
  let saveState: any;

  beforeEach(() => {
    jest.clearAllMocks();
    animations = [];
    generate = jest.fn().mockResolvedValue(null);
    generationRetry = jest.fn().mockResolvedValue(null);
    save = jest.fn().mockResolvedValue(null);
    saveRetry = jest.fn().mockResolvedValue(null);
    genState = { status: 'idle', preview: null, error: null };
    saveState = { status: 'idle', tripId: null, error: null };
    (useTripGeneration as jest.Mock).mockImplementation(() => ({
      state: genState, generate, retry: generationRetry, cancel: jest.fn(),
    }));
    (useTripPersistence as jest.Mock).mockImplementation(() => ({
      state: saveState, save, retry: saveRetry, cancel: jest.fn(),
    }));
  });

  const render = async () => await renderHook(() => useTripLifecycleCoordinator()) as any;
  const reachSavingHold = async (result: any, rerender: any) => {
    await act(() => result.current.submit(wizard));
    expect(await completeNext()).toBe(LIFECYCLE_BOUNDARIES.GENERATION_LATCH);
    await act(() => { genState = { status: 'success', preview, error: null }; });
    await rerender(undefined as never);
    expect(await completeNext()).toBe(LIFECYCLE_BOUNDARIES.PERSISTENCE_ENTRY);
    expect(save).toHaveBeenCalledWith(preview, 'Title');
    expect(await completeNext()).toBe(LIFECYCLE_BOUNDARIES.SAVING_HOLD_ENTRY);
  };

  it('holds slow generation at F151 without persistence', async () => {
    generate.mockReturnValue(new Promise(() => undefined));
    const { result } = await render();
    await act(() => result.current.submit(wizard));
    expect(await completeNext()).toBe(151);
    expect(result.current.status).toBe('GENERATION_HOLD');
    expect(save).not.toHaveBeenCalled();
  });

  it('keeps an early generation error after the already-scheduled F151 callback', async () => {
    generate.mockReturnValue(new Promise(() => undefined));
    const { result, rerender } = await render();
    await act(() => result.current.submit(wizard));
    await act(() => { genState = { status: 'error', preview: null, error: new Error('early') }; });
    await rerender(undefined as never);
    expect(result.current.status).toBe('GENERATION_ERROR');
    expect(await completeNext()).toBe(LIFECYCLE_BOUNDARIES.GENERATION_LATCH);
    expect(result.current.status).toBe('GENERATION_ERROR');
    expect(save).not.toHaveBeenCalled();
  });
  it('latches an early draft and starts one persistence at F152 with that exact draft', async () => {
    generate.mockResolvedValue(preview);
    save.mockReturnValue(new Promise(() => undefined));
    const { result } = await render();
    await act(() => result.current.submit(wizard));
    await act(async () => undefined);
    expect(save).not.toHaveBeenCalled();
    expect(await completeNext()).toBe(151);
    expect(await completeNext()).toBe(152);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenLastCalledWith(preview, 'Title');
  });

  it('latches a slow F151 result instead of reading stale rendered draft', async () => {
    generate.mockReturnValue(new Promise(() => undefined));
    save.mockReturnValue(new Promise(() => undefined));
    const { result, rerender } = await render();
    await act(() => result.current.submit(wizard));
    await completeNext();
    await act(() => { genState = { status: 'success', preview, error: null }; });
    await rerender(undefined as never);
    expect(await completeNext()).toBe(152);
    expect(save).toHaveBeenCalledWith(preview, 'Title');
  });

  it('never starts persistence without a validated draft and ignores duplicate lifecycle delivery', async () => {
    generate.mockReturnValue(new Promise(() => undefined));
    const { result, rerender } = await render();
    await act(() => result.current.submit(wizard));
    await completeNext();
    await rerender(undefined as never);
    await rerender(undefined as never);
    expect(save).not.toHaveBeenCalled();
    await act(() => { genState = { status: 'success', preview, error: null }; });
    await rerender(undefined as never);
    await rerender(undefined as never);
    expect(await completeNext()).toBe(152);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('holds slow persistence at F161, not F176', async () => {
    generate.mockReturnValue(new Promise(() => undefined));
    save.mockReturnValue(new Promise(() => undefined));
    const { result, rerender } = await render();
    await reachSavingHold(result, rerender);
    expect(result.current.status).toBe('SAVING');
    expect(animations.map((animation) => animation.toValue)).not.toContain(176);
  });

  it('latches an early persistence error until F161 and keeps retry persistence-only', async () => {
    generate.mockReturnValue(new Promise(() => undefined));
    save.mockReturnValue(new Promise(() => undefined));
    const { result, rerender } = await render();
    await act(() => result.current.submit(wizard));
    expect(await completeNext()).toBe(LIFECYCLE_BOUNDARIES.GENERATION_LATCH);
    await act(() => { genState = { status: 'success', preview, error: null }; });
    await rerender(undefined as never);
    expect(await completeNext()).toBe(LIFECYCLE_BOUNDARIES.PERSISTENCE_ENTRY);
    await act(() => { saveState = { status: 'error', tripId: null, error: new Error('early save') }; });
    await rerender(undefined as never);
    expect(result.current.status).toBe('SAVING');
    expect(await completeNext()).toBe(LIFECYCLE_BOUNDARIES.SAVING_HOLD_ENTRY);
    expect(result.current.status).toBe('SAVE_ERROR');
    expect(animations.map((animation) => animation.toValue)).not.toContain(LIFECYCLE_BOUNDARIES.SAVING_HOLD_EXIT);
    await act(() => result.current.retrySave());
    expect(saveRetry).toHaveBeenCalledTimes(1);
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it('ignores a cancelled attempt F151 callback after a newer attempt starts', async () => {
    generate.mockReturnValue(new Promise(() => undefined));
    const { result } = await render();
    await act(() => result.current.submit(wizard));
    const staleF151 = animations.shift();
    await act(() => result.current.cancel());
    await act(() => result.current.submit(wizard));
    await act(() => staleF151?.complete());
    expect(result.current.status).toBe('GENERATING');
    expect(save).not.toHaveBeenCalled();
  });
  it('exposes success only after real tripId and F177, never at F176', async () => {
    const saveResult = deferred<string>();
    generate.mockReturnValue(new Promise(() => undefined));
    save.mockReturnValue(saveResult.promise);
    const { result, rerender } = await render();
    await reachSavingHold(result, rerender);
    await act(async () => { saveResult.resolve('trip-123'); await saveResult.promise; });
    expect(result.current.status).toBe('SAVING');
    expect(await completeNext()).toBe(176);
    expect(result.current.status).toBe('SAVING');
    expect(await completeNext()).toBe(177);
    expect(result.current.status).toBe('SAVE_SUCCESS');
    expect(result.current.tripId).toBe('trip-123');
  });

  it('does not expose success when persistence reports success without a trip id', async () => {
    generate.mockReturnValue(new Promise(() => undefined));
    save.mockReturnValue(new Promise(() => undefined));
    const { result, rerender } = await render();
    await reachSavingHold(result, rerender);
    await act(() => { saveState = { status: 'success', tripId: null, error: null }; });
    await rerender(undefined as never);
    expect(result.current.status).toBe('SAVING');
    expect(animations.map((animation) => animation.toValue)).not.toContain(176);
  });

  it('does not run normal playback backward and only a fresh generation retry resets origin', async () => {
    generate.mockReturnValue(new Promise(() => undefined));
    const { result, rerender } = await render();
    await act(() => result.current.submit(wizard));
    await completeNext();
    await act(() => { genState = { status: 'error', preview: null, error: new Error('no') }; });
    await rerender(undefined as never);
    expect(result.current.status).toBe('GENERATION_ERROR');
    await act(() => result.current.retryGeneration());
    expect(result.current.frameAnim).toBeDefined();
    expect(generationRetry).toHaveBeenCalledTimes(1);
    expect(generate).toHaveBeenCalledTimes(1);
    expect(animations[0]?.toValue).toBe(151);
  });

  it('keeps generation retry generation-only and save retry persistence-only', async () => {
    generate.mockReturnValue(new Promise(() => undefined));
    save.mockReturnValue(new Promise(() => undefined));
    const { result, rerender } = await render();
    await act(() => result.current.submit(wizard));
    await completeNext();
    await act(() => { genState = { status: 'error', preview: null, error: new Error('no') }; });
    await rerender(undefined as never);
    await act(() => result.current.retryGeneration());
    expect(save).not.toHaveBeenCalled();
    animations = [];
    genState = { status: 'idle', preview: null, error: null };
    saveState = { status: 'idle', tripId: null, error: null };

    const fresh = await render();
    await reachSavingHold(fresh.result, fresh.rerender);
    await act(() => { saveState = { status: 'error', tripId: null, error: new Error('db') }; });
    await fresh.rerender(undefined as never);
    await act(() => fresh.result.current.retrySave());
    expect(saveRetry).toHaveBeenCalledTimes(1);
    expect(generate).toHaveBeenCalledTimes(2);
  });

  it('prevents duplicate submit and ignores stale callbacks after cancel or unmount', async () => {
    const generated = deferred<any>();
    generate.mockReturnValue(generated.promise);
    const { result, unmount } = await render();
    await act(() => { result.current.submit(wizard); result.current.submit(wizard); });
    expect(generate).toHaveBeenCalledTimes(1);
    await act(() => result.current.cancel());
    await act(async () => { generated.resolve(preview); await generated.promise; });
    expect(save).not.toHaveBeenCalled();
    await unmount();
  });

  it('rerenders for locale or theme presentation context without restarting work or timeline', async () => {
    generate.mockReturnValue(new Promise(() => undefined));
    const { result, rerender } = await render();
    await act(() => result.current.submit(wizard));
    await rerender(undefined as never);
    await rerender(undefined as never);
    expect(generate).toHaveBeenCalledTimes(1);
    expect(save).not.toHaveBeenCalled();
    expect(animations).toHaveLength(1);
  });
});
