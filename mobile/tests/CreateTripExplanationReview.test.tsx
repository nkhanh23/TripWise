import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';

import { CreateTripSuccessView } from '../src/features/planner/components/CreateTripSuccessView';
import type { PlannerGeneratedPreview } from '../src/features/planner/generationContracts';
import { TranslationProvider } from '../src/i18n';
import { ThemeProvider } from '../src/theme';
import { initialWizardState } from '../src/features/planner/data/mockWizardData';

const preview: PlannerGeneratedPreview = {
  title: 'Tokyo draft', destination: 'Tokyo', startDate: '2026-10-01', endDate: '2026-10-03',
  days: Array.from({ length: 3 }, (_, index) => ({
    dayNumber: index + 1, date: `2026-10-0${index + 1}`,
    items: [{ position: 1, placeName: `Suggestion ${index + 1}`, resolution: 'UNRESOLVED' }],
  })),
};

async function renderReview(locale: 'en' | 'vi' = 'en', theme: 'light' | 'dark' = 'light', callbacks = {
  onSave: jest.fn(), onReject: jest.fn(), onViewItinerary: jest.fn(), onExplorePlaces: jest.fn(),
}) {
  return {
    callbacks,
    view: await render(
      <ThemeProvider initialPreference={theme}>
        <TranslationProvider initialLocale={locale}>
          <CreateTripSuccessView {...callbacks} preview={preview}
            state={{ ...initialWizardState, selectedStyles: ['culture', 'food'] }} />
        </TranslationProvider>
      </ThemeProvider>,
    ),
  };
}

describe('FEATURE-P5-T005 generated itinerary review', () => {
  afterEach(async () => { await cleanup(); });
  it('shows explanation and factual provenance before confirmation', async () => {
    await renderReview();
    expect(screen.getByText('Why this itinerary?')).toBeTruthy();
    expect(screen.getByText('3-day draft based on 2 preferences you selected.')).toBeTruthy();
    expect(screen.getByText('Source: Your trip preferences')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Confirm and save itinerary' })).toBeTruthy();
  });
  it('renders the Vietnamese path from the same facts', async () => {
    await renderReview('vi');
    expect(screen.getByText('Vì sao có lịch trình này?')).toBeTruthy();
    expect(screen.getByText('Bản nháp 3 ngày dựa trên 2 sở thích bạn đã chọn.')).toBeTruthy();
    expect(screen.getByText('Nguồn: Sở thích chuyến đi của bạn')).toBeTruthy();
  });
  it.each(['light', 'dark'] as const)('remains renderable in %s theme', async (theme) => {
    const { view } = await renderReview('en', theme);
    expect(view.toJSON()).toBeTruthy();
  });
  it('calls only the explicit persistence callback on confirm', async () => {
    const { callbacks } = await renderReview();
    await fireEvent.press(screen.getByRole('button', { name: 'Confirm and save itinerary' }));
    expect(callbacks.onSave).toHaveBeenCalledTimes(1);
    expect(callbacks.onReject).not.toHaveBeenCalled();
  });
  it('rejects with zero persistence callback', async () => {
    const { callbacks } = await renderReview();
    await fireEvent.press(screen.getByRole('button', { name: 'Reject this draft' }));
    expect(callbacks.onReject).toHaveBeenCalledTimes(1);
    expect(callbacks.onSave).not.toHaveBeenCalled();
  });
  it('view and explore actions do not persist', async () => {
    const { callbacks } = await renderReview();
    await fireEvent.press(screen.getByRole('button', { name: 'View itinerary' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Explore places' }));
    expect(callbacks.onViewItinerary).toHaveBeenCalledTimes(1);
    expect(callbacks.onExplorePlaces).toHaveBeenCalledTimes(1);
    expect(callbacks.onSave).not.toHaveBeenCalled();
  });
  it('provides understandable reason and provenance copy alongside labelled controls', async () => {
    const { view } = await renderReview();
    expect(view.getByText('3-day draft based on 2 preferences you selected.')).toBeTruthy();
    expect(view.getByText('Source: Your trip preferences')).toBeTruthy();
    expect(view.getByRole('button', { name: 'Reject this draft' })).toBeTruthy();
  });
});
