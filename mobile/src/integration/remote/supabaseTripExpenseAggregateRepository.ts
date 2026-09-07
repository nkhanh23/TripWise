import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '../../lib/supabase/database.types';
import { IntegrationError, mapPostgrestError } from '../errors';
import { parseExpenseAggregatePage, validateExpenseAggregateRequest } from '../expenseAggregate';
import type { ExpenseAggregatePage, ExpenseAggregateRequest, TripExpenseAggregateRepository } from '../expenseAggregate';
import { executeWithReliability, supabaseReadPolicy } from '../reliability';

export class SupabaseTripExpenseAggregateRepository implements TripExpenseAggregateRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async getAggregate(request: ExpenseAggregateRequest, signal?: AbortSignal): Promise<ExpenseAggregatePage> {
    const validated = validateExpenseAggregateRequest(request);
    return executeWithReliability(async attemptSignal => {
      const { data, error } = await this.client.rpc('get_trip_expense_aggregate', {
        p_request: validated as unknown as Json,
      }).abortSignal(attemptSignal);
      if (error?.code === 'P0002') throw new IntegrationError('notFound');
      if (error?.code === '22003') throw new IntegrationError('invalidResponse');
      if (error) throw mapPostgrestError(error);
      return parseExpenseAggregatePage(data, validated);
    }, supabaseReadPolicy, signal);
  }
}
