import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { Animated } from 'react-native';

import { TranslationProvider } from '../src/i18n';
import { CreateTripMotionPreview } from '../src/features/planner/motion/CreateTripMotionPreview';
import { CreateTripWizardScreen } from '../src/features/planner/screens/CreateTripWizardScreen';
import { ThemeProvider } from '../src/theme';
import { useTripLifecycleCoordinator } from '../src/features/planner/motion/useTripLifecycleCoordinator';

jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('@react-navigation/native', () => ({ ...jest.requireActual('@react-navigation/native'), useNavigation: () => ({ navigate: jest.fn(), canGoBack: () => true, goBack: jest.fn() }) }));
jest.mock('../src/features/planner/motion/useTripLifecycleCoordinator', () => ({ useTripLifecycleCoordinator: jest.fn() }));

const mockCoordinator = useTripLifecycleCoordinator as jest.Mock;
const mockSubmit = jest.fn();
const mockRetryGeneration = jest.fn();
const mockRetrySave = jest.fn();
const mockCancel = jest.fn();

const previewGlobal = globalThis as typeof globalThis & { __DEV__: boolean };

async function renderWithProviders(node: React.ReactNode) {
  return await render(
    <ThemeProvider initialPreference="light">
      <TranslationProvider initialLocale="en">{node}</TranslationProvider>
    </ThemeProvider>,
  );
}

describe('Create Trip DEV-only motion preview', () => {
  let originalDev: boolean;

  beforeEach(() => {
    originalDev = previewGlobal.__DEV__;
    previewGlobal.__DEV__ = true;
    jest.clearAllMocks();
    mockCoordinator.mockReturnValue({
      status: 'IDLE',
      frameAnim: new Animated.Value(0),
      draft: null,
      tripId: null,
      generationError: null,
      saveError: null,
      submit: mockSubmit,
      retryGeneration: mockRetryGeneration,
      retrySave: mockRetrySave,
      cancel: mockCancel,
    });
  });

  afterEach(() => {
    cleanup();
    previewGlobal.__DEV__ = originalDev;
    jest.restoreAllMocks();
  });

  it('exposes the entry only in DEV', async () => {
    const { rerender } = await renderWithProviders(<CreateTripWizardScreen initialStep={5} />);
    expect(screen.getByLabelText('Preview Motion')).toBeTruthy();

    previewGlobal.__DEV__ = false;
    await rerender(
      <ThemeProvider initialPreference="light">
        <TranslationProvider initialLocale="en"><CreateTripWizardScreen initialStep={5} /></TranslationProvider>
      </ThemeProvider>,
    );
    expect(screen.queryByLabelText('Preview Motion')).toBeNull();
  });

  it('renders the real generation presentation and keeps every preview control local', async () => {
    const onClose = jest.fn();
    const animations: Array<{ complete: () => void; toValue: number }> = [];
    jest.spyOn(Animated, 'timing').mockImplementation((_value, config) => ({
      start: (callback?: (result: { finished: boolean }) => void) => {
        animations.push({ toValue: (config as { toValue: number }).toValue, complete: () => callback?.({ finished: true }) });
      },
      stop: jest.fn(),
      reset: jest.fn(),
    }) as never);

    await renderWithProviders(<CreateTripMotionPreview destination="" durationDays={3} onClose={onClose} />);
    expect(screen.getByText('TripWise')).toBeTruthy();
    expect(screen.getByTestId('motion-preview-frame')).toHaveTextContent('Frame F000');

    for (const frame of [24, 95, 110, 120, 151]) {
      const paddedFrame = String(frame).padStart(3, '0');
      await act(async () => fireEvent.press(screen.getByLabelText(`Seek F${paddedFrame}`)));
      expect(screen.getByTestId('motion-preview-frame')).toHaveTextContent(`Frame F${String(frame).padStart(3, '0')}`);
    }

    await act(async () => fireEvent.press(screen.getByLabelText('Reset')));
    expect(screen.getByTestId('motion-preview-frame')).toHaveTextContent('Frame F000');

    await act(async () => fireEvent.press(screen.getByLabelText('Replay F000 → F151')));
    expect(animations).toHaveLength(1);
    expect(animations[0]?.toValue).toBe(151);
    await act(async () => animations[0]?.complete());
    expect(screen.getByTestId('motion-preview-frame')).toHaveTextContent('Frame F151');

    await act(async () => fireEvent.press(screen.getByLabelText('Close')));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockSubmit).not.toHaveBeenCalled();
    expect(mockRetryGeneration).not.toHaveBeenCalled();
    expect(mockRetrySave).not.toHaveBeenCalled();
    expect(mockCancel).not.toHaveBeenCalled();
  });

  it('does not invoke the production lifecycle when opening, controlling, or closing the DEV entry', async () => {
    await renderWithProviders(<CreateTripWizardScreen initialStep={5} />);
    await act(async () => fireEvent.press(screen.getByLabelText('Preview Motion')));
    await act(async () => fireEvent.press(screen.getByLabelText('Seek F024')));
    await act(async () => fireEvent.press(screen.getByLabelText('Reset')));
    await act(async () => fireEvent.press(screen.getByLabelText('Close')));

    expect(mockSubmit).not.toHaveBeenCalled();
    expect(mockRetryGeneration).not.toHaveBeenCalled();
    expect(mockRetrySave).not.toHaveBeenCalled();
    expect(mockCancel).not.toHaveBeenCalled();
  });
});
