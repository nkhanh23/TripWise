-- FEATURE-P3-T001 corrective: strict JSON, trip binding, server-owned audit fields.
-- The applied 20260907010000 migration is intentionally unchanged.
-- Column grants keep direct owner CRUD and SECURITY INVOKER RPCs usable,
-- while defaults/trigger alone own id, created_at and updated_at.
revoke insert, update on public.trip_expenses from authenticated;
grant insert (trip_id, itinerary_item_id, category, origin, amount, currency, note, spent_at)
  on public.trip_expenses to authenticated;
grant update (itinerary_item_id, category, origin, amount, currency, note, spent_at)
  on public.trip_expenses to authenticated;

-- Defensive immutability also protects the cursor under privileged maintenance.
create or replace function public.enforce_trip_expense_immutability()
returns trigger language plpgsql security invoker set search_path = pg_catalog
as $$
begin
  if new.id is distinct from old.id or new.trip_id is distinct from old.trip_id
     or new.created_at is distinct from old.created_at then
    raise exception 'Expense identity and creation timestamp are immutable.' using errcode = '22023';
  end if;
  return new;
end;
$$;
drop trigger trip_expenses_enforce_immutability on public.trip_expenses;
create trigger trip_expenses_enforce_immutability
before update on public.trip_expenses
for each row execute function public.enforce_trip_expense_immutability();

-- Remove the old bypass entirely: no authenticated one-argument overload remains.
drop function public.delete_trip_expense(uuid);

-- RPC: create_trip_expense
create or replace function public.create_trip_expense(p_command jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_trip_id uuid;
  v_category text;
  v_origin text;
  v_amount numeric(12, 2);
  v_currency text;
  v_note text;
  v_spent_at timestamptz;
  v_itinerary_item_id uuid;
  v_new_expense public.trip_expenses%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication is required.' using errcode = '28000';
  end if;

  if p_command is null or jsonb_typeof(p_command) <> 'object' then
    raise exception 'Create trip expense command is invalid.' using errcode = '22023';
  end if;

  -- Client cannot supply or forge owner identity
  if (p_command - array['tripId','category','origin','amount','currency','note','spentAt','itineraryItemId']) <> '{}'::jsonb then
    raise exception 'Unsupported expense command field.' using errcode = '22023';
  end if;

  begin
    v_trip_id := (p_command->>'tripId')::uuid;
  exception when others then
    raise exception 'Trip ID is invalid.' using errcode = '22023';
  end;

  if v_trip_id is null then
    raise exception 'Trip ID is required.' using errcode = '22023';
  end if;

  -- Verify trip exists and is owned by caller
  if not exists (select 1 from public.trips where id = v_trip_id and user_id = v_user_id) then
    raise exception 'Trip not found.' using errcode = 'P0002';
  end if;

  v_category := p_command->>'category';
  if v_category is null or v_category not in ('food', 'transport', 'accommodation', 'activity', 'shopping', 'ticket', 'personal', 'reservation', 'other') then
    raise exception 'Expense category is invalid.' using errcode = '22023';
  end if;

  v_origin := p_command->>'origin';
  if v_origin is null or v_origin not in ('planned', 'actual', 'unplanned') then
    raise exception 'Expense origin is invalid.' using errcode = '22023';
  end if;

  begin
    v_amount := (p_command->>'amount')::numeric;
  exception when others then
    raise exception 'Expense amount is invalid.' using errcode = '22023';
  end;

  if v_amount is null or v_amount <= 0 or v_amount > 9999999999.99 then
    raise exception 'Expense amount must be positive and within bounds.' using errcode = '22023';
  end if;

  v_currency := btrim(coalesce(p_command->>'currency', ''));
  if v_currency !~ '^[A-Z]{3}$' then
    raise exception 'Expense currency must be a 3-letter uppercase ISO code.' using errcode = '22023';
  end if;

  if p_command ? 'note' and p_command->>'note' is not null then
    v_note := btrim(p_command->>'note', E' \t\n\r\f\v' || U&'\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF');
    if length(v_note) < 1 or length(v_note) > 500 then
      raise exception 'Expense note must be between 1 and 500 characters.' using errcode = '22023';
    end if;
  else
    v_note := null;
  end if;

  if p_command ? 'spentAt' and p_command->>'spentAt' is not null then
    begin
      v_spent_at := (p_command->>'spentAt')::timestamptz;
    exception when others then
      raise exception 'Expense spent timestamp is invalid.' using errcode = '22023';
    end;
    if v_spent_at < '2000-01-01T00:00:00Z'::timestamptz or v_spent_at > '2100-01-01T00:00:00Z'::timestamptz then
      raise exception 'Expense spent timestamp is out of acceptable range.' using errcode = '22023';
    end if;
  else
    v_spent_at := null;
  end if;

  if p_command ? 'itineraryItemId' and p_command->>'itineraryItemId' is not null then
    begin
      v_itinerary_item_id := (p_command->>'itineraryItemId')::uuid;
    exception when others then
      raise exception 'Itinerary item ID is invalid.' using errcode = '22023';
    end;
  else
    v_itinerary_item_id := null;
  end if;

  insert into public.trip_expenses (
    trip_id,
    itinerary_item_id,
    category,
    origin,
    amount,
    currency,
    note,
    spent_at
  ) values (
    v_trip_id,
    v_itinerary_item_id,
    v_category,
    v_origin,
    v_amount,
    v_currency,
    v_note,
    v_spent_at
  )
  returning * into v_new_expense;

  return jsonb_build_object(
    'id', v_new_expense.id,
    'tripId', v_new_expense.trip_id,
    'itineraryItemId', v_new_expense.itinerary_item_id,
    'category', v_new_expense.category,
    'origin', v_new_expense.origin,
    'amount', v_new_expense.amount,
    'currency', btrim(v_new_expense.currency),
    'note', v_new_expense.note,
    'spentAt', v_new_expense.spent_at,
    'createdAt', v_new_expense.created_at,
    'updatedAt', v_new_expense.updated_at
  );
end;
$$;

revoke all on function public.create_trip_expense(jsonb) from public, anon;
grant execute on function public.create_trip_expense(jsonb) to authenticated;

-- RPC: update_trip_expense
create or replace function public.update_trip_expense(p_command jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_expense_id uuid;
  v_trip_id uuid;
  v_patch jsonb;
  v_category text;
  v_origin text;
  v_amount numeric(12, 2);
  v_currency text;
  v_note text;
  v_spent_at timestamptz;
  v_itinerary_item_id uuid;
  v_current public.trip_expenses%rowtype;
  v_updated public.trip_expenses%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication is required.' using errcode = '28000';
  end if;

  if p_command is null or jsonb_typeof(p_command) <> 'object' then
    raise exception 'Update trip expense command is invalid.' using errcode = '22023';
  end if;

  if (p_command - array['expenseId','tripId','patch']) <> '{}'::jsonb then
    raise exception 'Unsupported expense command field.' using errcode = '22023';
  end if;

  begin
    v_expense_id := (p_command->>'expenseId')::uuid;
  exception when others then
    raise exception 'Expense ID is invalid.' using errcode = '22023';
  end;

  if v_expense_id is null then
    raise exception 'Expense ID is required.' using errcode = '22023';
  end if;

  begin
    v_trip_id := (p_command->>'tripId')::uuid;
  exception when invalid_text_representation then
    raise exception 'Trip ID is invalid.' using errcode = '22023';
  end;
  if v_trip_id is null then
    raise exception 'Trip ID is required.' using errcode = '22023';
  end if;

  -- Bind the row to the supplied trip and owner; serialize read/patch/write.
  -- Load existing expense and verify ownership via trip
  select e.* into v_current
  from public.trip_expenses e
  join public.trips t on t.id = e.trip_id
  where e.id = v_expense_id
    and e.trip_id = v_trip_id
    and t.user_id = v_user_id
  for update of e;

  if not found then
    raise exception 'Expense not found.' using errcode = 'P0002';
  end if;

  v_patch := p_command->'patch';
  if v_patch is null or jsonb_typeof(v_patch) <> 'object' or v_patch = '{}'::jsonb then
    raise exception 'Patch object is required.' using errcode = '22023';
  end if;

  if (v_patch - array['category','origin','amount','currency','note','spentAt','itineraryItemId']) <> '{}'::jsonb then
    raise exception 'Immutable identifiers cannot be patched.' using errcode = '22023';
  end if;

  -- Patch category
  if v_patch ? 'category' then
    v_category := v_patch->>'category';
    if v_category is null or v_category not in ('food', 'transport', 'accommodation', 'activity', 'shopping', 'ticket', 'personal', 'reservation', 'other') then
      raise exception 'Expense category is invalid.' using errcode = '22023';
    end if;
  else
    v_category := v_current.category;
  end if;

  -- Patch origin
  if v_patch ? 'origin' then
    v_origin := v_patch->>'origin';
    if v_origin is null or v_origin not in ('planned', 'actual', 'unplanned') then
      raise exception 'Expense origin is invalid.' using errcode = '22023';
    end if;
  else
    v_origin := v_current.origin;
  end if;

  -- Patch amount
  if v_patch ? 'amount' then
    begin
      v_amount := (v_patch->>'amount')::numeric;
    exception when others then
      raise exception 'Expense amount is invalid.' using errcode = '22023';
    end;
    if v_amount is null or v_amount <= 0 or v_amount > 9999999999.99 then
      raise exception 'Expense amount must be positive and within bounds.' using errcode = '22023';
    end if;
  else
    v_amount := v_current.amount;
  end if;

  -- Patch currency
  if v_patch ? 'currency' then
    v_currency := btrim(coalesce(v_patch->>'currency', ''));
    if v_currency !~ '^[A-Z]{3}$' then
      raise exception 'Expense currency must be a 3-letter uppercase ISO code.' using errcode = '22023';
    end if;
  else
    v_currency := v_current.currency;
  end if;

  -- Patch note
  if v_patch ? 'note' then
    if v_patch->>'note' is null then
      v_note := null;
    else
      v_note := btrim(v_patch->>'note', E' \t\n\r\f\v' || U&'\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF');
      if length(v_note) < 1 or length(v_note) > 500 then
        raise exception 'Expense note must be between 1 and 500 characters.' using errcode = '22023';
      end if;
    end if;
  else
    v_note := v_current.note;
  end if;

  -- Patch spent_at
  if v_patch ? 'spentAt' then
    if v_patch->>'spentAt' is null then
      v_spent_at := null;
    else
      begin
        v_spent_at := (v_patch->>'spentAt')::timestamptz;
      exception when others then
        raise exception 'Expense spent timestamp is invalid.' using errcode = '22023';
      end;
      if v_spent_at < '2000-01-01T00:00:00Z'::timestamptz or v_spent_at > '2100-01-01T00:00:00Z'::timestamptz then
        raise exception 'Expense spent timestamp is out of acceptable range.' using errcode = '22023';
      end if;
    end if;
  else
    v_spent_at := v_current.spent_at;
  end if;

  -- Patch itinerary_item_id
  if v_patch ? 'itineraryItemId' then
    if v_patch->>'itineraryItemId' is null then
      v_itinerary_item_id := null;
    else
      begin
        v_itinerary_item_id := (v_patch->>'itineraryItemId')::uuid;
      exception when others then
        raise exception 'Itinerary item ID is invalid.' using errcode = '22023';
      end;
    end if;
  else
    v_itinerary_item_id := v_current.itinerary_item_id;
  end if;

  update public.trip_expenses
  set category = v_category,
      origin = v_origin,
      amount = v_amount,
      currency = v_currency,
      note = v_note,
      spent_at = v_spent_at,
      itinerary_item_id = v_itinerary_item_id
  where id = v_expense_id and trip_id = v_trip_id
  returning * into v_updated;

  return jsonb_build_object(
    'id', v_updated.id,
    'tripId', v_updated.trip_id,
    'itineraryItemId', v_updated.itinerary_item_id,
    'category', v_updated.category,
    'origin', v_updated.origin,
    'amount', v_updated.amount,
    'currency', btrim(v_updated.currency),
    'note', v_updated.note,
    'spentAt', v_updated.spent_at,
    'createdAt', v_updated.created_at,
    'updatedAt', v_updated.updated_at
  );
end;
$$;

revoke all on function public.update_trip_expense(jsonb) from public, anon;
grant execute on function public.update_trip_expense(jsonb) to authenticated;

-- RPC: delete_trip_expense
create or replace function public.delete_trip_expense(p_trip_id uuid, p_expense_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_deleted boolean;
begin
  if v_user_id is null then
    raise exception 'Authentication is required.' using errcode = '28000';
  end if;

  if p_trip_id is null or p_expense_id is null then
    raise exception 'Expense ID is required.' using errcode = '22023';
  end if;

  delete from public.trip_expenses
  where id = p_expense_id
    and trip_id = p_trip_id
    and exists (
      select 1 from public.trips
      where trips.id = trip_expenses.trip_id
        and trips.user_id = v_user_id
    );

  v_deleted := found;
  return v_deleted;
end;
$$;

revoke all on function public.delete_trip_expense(uuid, uuid) from public, anon;
grant execute on function public.delete_trip_expense(uuid, uuid) to authenticated;

