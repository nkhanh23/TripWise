-- FEATURE-P3-T001: Private expense ledger, categories, origins, attachment, RLS, and keyset pagination.

create table public.trip_expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  itinerary_item_id uuid references public.itinerary_items (id) on delete set null,
  category text not null check (category in ('food', 'transport', 'accommodation', 'activity', 'shopping', 'ticket', 'personal', 'reservation', 'other')),
  origin text not null check (origin in ('planned', 'actual', 'unplanned')),
  amount numeric(12, 2) not null check (amount > 0 and amount <= 9999999999.99),
  currency char(3) not null check (currency ~ '^[A-Z]{3}$'),
  note text check (note is null or length(btrim(note)) between 1 and 500),
  spent_at timestamptz check (spent_at is null or spent_at between '2000-01-01T00:00:00Z' and '2100-01-01T00:00:00Z'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.trip_expenses is
  'FEATURE-P3-T001 private owner-scoped trip expense ledger storing original amounts and currencies without fabricated conversions.';

create index trip_expenses_trip_created_id_idx
  on public.trip_expenses (trip_id, created_at desc, id desc);

create index trip_expenses_itinerary_item_id_idx
  on public.trip_expenses (itinerary_item_id)
  where itinerary_item_id is not null;

create index trip_expenses_trip_category_idx
  on public.trip_expenses (trip_id, category, created_at desc, id desc);

create index trip_expenses_trip_origin_idx
  on public.trip_expenses (trip_id, origin, created_at desc, id desc);

create trigger trip_expenses_set_updated_at
before update on public.trip_expenses
for each row execute function public.set_updated_at();

create or replace function public.enforce_trip_expense_immutability()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if new.id <> old.id or new.trip_id <> old.trip_id then
    raise exception 'Expense ID and Trip ID are immutable.' using errcode = '22023';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_trip_expense_immutability() from public, anon, authenticated;

create trigger trip_expenses_enforce_immutability
before update of id, trip_id on public.trip_expenses
for each row execute function public.enforce_trip_expense_immutability();

create or replace function public.enforce_trip_expense_attachment_consistency()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if new.itinerary_item_id is not null then
    if not exists (
      select 1
      from public.itinerary_items as item
      join public.itinerary_days as day on day.id = item.itinerary_day_id
      where item.id = new.itinerary_item_id
        and day.trip_id = new.trip_id
    ) then
      raise exception 'Attached itinerary item must exist and belong to the same trip.' using errcode = '22023';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_trip_expense_attachment_consistency() from public, anon, authenticated;

create trigger trip_expenses_enforce_attachment_consistency
before insert or update of itinerary_item_id, trip_id on public.trip_expenses
for each row execute function public.enforce_trip_expense_attachment_consistency();

alter table public.trip_expenses enable row level security;

revoke all on public.trip_expenses from public, anon;
grant select, insert, update, delete on public.trip_expenses to authenticated;

create policy "trip_expenses_select_own"
on public.trip_expenses for select to authenticated
using (exists (
  select 1 from public.trips
  where trips.id = trip_expenses.trip_id
    and trips.user_id = (select auth.uid())
));

create policy "trip_expenses_insert_own"
on public.trip_expenses for insert to authenticated
with check (exists (
  select 1 from public.trips
  where trips.id = trip_expenses.trip_id
    and trips.user_id = (select auth.uid())
));

create policy "trip_expenses_update_own"
on public.trip_expenses for update to authenticated
using (exists (
  select 1 from public.trips
  where trips.id = trip_expenses.trip_id
    and trips.user_id = (select auth.uid())
))
with check (exists (
  select 1 from public.trips
  where trips.id = trip_expenses.trip_id
    and trips.user_id = (select auth.uid())
));

create policy "trip_expenses_delete_own"
on public.trip_expenses for delete to authenticated
using (exists (
  select 1 from public.trips
  where trips.id = trip_expenses.trip_id
    and trips.user_id = (select auth.uid())
));

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
  if p_command ? 'ownerId' or p_command ? 'userId' then
    raise exception 'Owner identity cannot be supplied by client.' using errcode = '22023';
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
    v_note := nullif(btrim(p_command->>'note'), '');
    if v_note is not null and (length(v_note) < 1 or length(v_note) > 500) then
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

  if p_command ? 'ownerId' or p_command ? 'userId' then
    raise exception 'Owner identity cannot be supplied by client.' using errcode = '22023';
  end if;

  begin
    v_expense_id := (p_command->>'expenseId')::uuid;
  exception when others then
    raise exception 'Expense ID is invalid.' using errcode = '22023';
  end;

  if v_expense_id is null then
    raise exception 'Expense ID is required.' using errcode = '22023';
  end if;

  -- Load existing expense and verify ownership via trip
  select e.* into v_current
  from public.trip_expenses e
  join public.trips t on t.id = e.trip_id
  where e.id = v_expense_id
    and t.user_id = v_user_id;

  if not found then
    raise exception 'Expense not found.' using errcode = 'P0002';
  end if;

  v_patch := p_command->'patch';
  if v_patch is null or jsonb_typeof(v_patch) <> 'object' then
    raise exception 'Patch object is required.' using errcode = '22023';
  end if;

  if v_patch ? 'id' or v_patch ? 'tripId' or v_patch ? 'ownerId' or v_patch ? 'userId' then
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
      v_note := nullif(btrim(v_patch->>'note'), '');
      if v_note is not null and (length(v_note) < 1 or length(v_note) > 500) then
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
  where id = v_expense_id
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
create or replace function public.delete_trip_expense(p_expense_id uuid)
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

  if p_expense_id is null then
    raise exception 'Expense ID is required.' using errcode = '22023';
  end if;

  delete from public.trip_expenses
  where id = p_expense_id
    and exists (
      select 1 from public.trips
      where trips.id = trip_expenses.trip_id
        and trips.user_id = v_user_id
    );

  v_deleted := found;
  return v_deleted;
end;
$$;

revoke all on function public.delete_trip_expense(uuid) from public, anon;
grant execute on function public.delete_trip_expense(uuid) to authenticated;

-- RPC: list_trip_expenses
create or replace function public.list_trip_expenses(
  p_trip_id uuid,
  p_limit integer default 20,
  p_cursor_created_at timestamptz default null,
  p_cursor_id uuid default null,
  p_category text default null,
  p_origin text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_limit integer;
  v_items jsonb;
  v_has_more boolean;
  v_last_created_at timestamptz;
  v_last_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication is required.' using errcode = '28000';
  end if;

  if p_trip_id is null then
    raise exception 'Trip ID is required.' using errcode = '22023';
  end if;

  -- Verify trip ownership
  if not exists (select 1 from public.trips where id = p_trip_id and user_id = v_user_id) then
    raise exception 'Trip not found.' using errcode = 'P0002';
  end if;

  if p_limit is null then
    v_limit := 20;
  elsif p_limit < 1 or p_limit > 50 then
    raise exception 'Limit must be between 1 and 50.' using errcode = '22023';
  else
    v_limit := p_limit;
  end if;

  if (p_cursor_created_at is null) <> (p_cursor_id is null) then
    raise exception 'Cursor created_at and id must be provided together.' using errcode = '22023';
  end if;

  if p_category is not null and p_category not in ('food', 'transport', 'accommodation', 'activity', 'shopping', 'ticket', 'personal', 'reservation', 'other') then
    raise exception 'Filter category is invalid.' using errcode = '22023';
  end if;

  if p_origin is not null and p_origin not in ('planned', 'actual', 'unplanned') then
    raise exception 'Filter origin is invalid.' using errcode = '22023';
  end if;

  with page_rows as (
    select
      e.id,
      e.trip_id,
      e.itinerary_item_id,
      e.category,
      e.origin,
      e.amount,
      e.currency,
      e.note,
      e.spent_at,
      e.created_at,
      e.updated_at,
      row_number() over (order by e.created_at desc, e.id desc) as row_num
    from public.trip_expenses e
    where e.trip_id = p_trip_id
      and (p_category is null or e.category = p_category)
      and (p_origin is null or e.origin = p_origin)
      and (
        p_cursor_created_at is null
        or (e.created_at, e.id) < (p_cursor_created_at, p_cursor_id)
      )
    order by e.created_at desc, e.id desc
    limit (v_limit + 1)
  ), visible_rows as (
    select * from page_rows where row_num <= v_limit
  ), last_visible as (
    select created_at, id from page_rows where row_num = v_limit
  )
  select
    coalesce(jsonb_agg(jsonb_build_object(
      'id', r.id,
      'tripId', r.trip_id,
      'itineraryItemId', r.itinerary_item_id,
      'category', r.category,
      'origin', r.origin,
      'amount', r.amount,
      'currency', btrim(r.currency),
      'note', r.note,
      'spentAt', r.spent_at,
      'createdAt', r.created_at,
      'updatedAt', r.updated_at
    ) order by r.created_at desc, r.id desc), '[]'::jsonb),
    exists(select 1 from page_rows where row_num = v_limit + 1),
    (select created_at from last_visible),
    (select id from last_visible)
  into v_items, v_has_more, v_last_created_at, v_last_id
  from visible_rows as r;

  return jsonb_build_object(
    'items', v_items,
    'nextCursor', case when v_has_more then jsonb_build_object(
      'createdAt', to_jsonb(v_last_created_at)->>0,
      'id', v_last_id
    ) else null end
  );
end;
$$;

revoke all on function public.list_trip_expenses(uuid, integer, timestamptz, uuid, text, text) from public, anon;
grant execute on function public.list_trip_expenses(uuid, integer, timestamptz, uuid, text, text) to authenticated;
