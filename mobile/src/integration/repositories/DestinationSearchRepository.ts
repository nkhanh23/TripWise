import type { DestinationOption } from '../../features/planner/types';
export interface DestinationSearchRepository {
  search(query: string, signal?: AbortSignal): Promise<DestinationOption[]>;
}

