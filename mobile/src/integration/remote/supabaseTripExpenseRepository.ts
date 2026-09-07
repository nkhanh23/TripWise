import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database, Json } from '../../lib/supabase/database.types';
import type {
  CreateTripExpenseCommand,
  DeleteTripExpenseCommand,
  ListTripExpensesRequest,
  TripExpenseRecord,
  TripExpensesPage,
  UpdateTripExpenseCommand,
} from '../contracts';
import { mapPostgrestError } from '../errors';
import type { TripExpenseLedgerRepository } from '../repositories';
import { executeWithReliability, supabaseMutationPolicy, supabaseReadPolicy } from '../reliability';
import {
  parseTripExpenseRecord,
  parseTripExpensesPage,
  validateCreateTripExpenseCommand,
  validateDeleteTripExpenseCommand,
  validateListTripExpensesRequest,
  validateUpdateTripExpenseCommand,
} from '../validation';

export class SupabaseTripExpenseLedgerRepository implements TripExpenseLedgerRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async createExpense(command: CreateTripExpenseCommand, signal?: AbortSignal): Promise<TripExpenseRecord> {
    const validated = validateCreateTripExpenseCommand(command);
    return executeWithReliability(
      async (attemptSignal) => {
        const { data, error } = await this.client
          .rpc('create_trip_expense', {
            p_command: validated as unknown as Json,
          })
          .abortSignal(attemptSignal);

        if (error) throw mapPostgrestError(error);
        return parseTripExpenseRecord(data);
      },
      supabaseMutationPolicy,
      signal
    );
  }

  async updateExpense(command: UpdateTripExpenseCommand, signal?: AbortSignal): Promise<TripExpenseRecord> {
    const validated = validateUpdateTripExpenseCommand(command);
    return executeWithReliability(
      async (attemptSignal) => {
        const { data, error } = await this.client
          .rpc('update_trip_expense', {
            p_command: validated as unknown as Json,
          })
          .abortSignal(attemptSignal);

        if (error) throw mapPostgrestError(error);
        return parseTripExpenseRecord(data);
      },
      supabaseMutationPolicy,
      signal
    );
  }

  async deleteExpense(command: DeleteTripExpenseCommand, signal?: AbortSignal): Promise<boolean> {
    const validated = validateDeleteTripExpenseCommand(command);
    return executeWithReliability(
      async (attemptSignal) => {
        const { data, error } = await this.client
          .rpc('delete_trip_expense', {
            p_expense_id: validated.expenseId,
          })
          .abortSignal(attemptSignal);

        if (error) throw mapPostgrestError(error);
        return Boolean(data);
      },
      supabaseMutationPolicy,
      signal
    );
  }

  async listExpenses(request: ListTripExpensesRequest, signal?: AbortSignal): Promise<TripExpensesPage> {
    const validated = validateListTripExpensesRequest(request);
    return executeWithReliability(
      async (attemptSignal) => {
        const { data, error } = await this.client
          .rpc('list_trip_expenses', {
            p_trip_id: validated.tripId,
            p_limit: validated.limit,
            p_cursor_created_at: validated.cursor?.createdAt,
            p_cursor_id: validated.cursor?.id,
            p_category: validated.category,
            p_origin: validated.origin,
          })
          .abortSignal(attemptSignal);

        if (error) throw mapPostgrestError(error);
        return parseTripExpensesPage(data);
      },
      supabaseReadPolicy,
      signal
    );
  }
}
