
import { mapWizardStateToGenerateTripRequest } from './src/features/planner/generationContracts';
import { validateGeneratedTrip } from '../supabase/functions/generate-trip/contract';
import { buildTripPrompt, tripPlannerSystemInstruction } from '../supabase/functions/generate-trip/prompt';
import { generatedTripJsonSchema } from '../supabase/functions/generate-trip/contract';

const intent = {
  destination: { name: 'Nha Trang' },
  customDestinationName: '',
  startDate: '2026-08-30',
  endDate: '2026-09-01',
  durationDays: 3,
  selectedStyles: ['relaxation', 'beaches'],
  pace: 'relaxed',
  budget: 'moderate',
  groupType: 'couple',
};

const req = mapWizardStateToGenerateTripRequest(intent as any);
console.log('Request:', req);

