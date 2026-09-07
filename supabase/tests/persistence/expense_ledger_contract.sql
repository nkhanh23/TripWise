\set ON_ERROR_STOP on

-- FEATURE-P3-T001: Private expense ledger, categories, origins, attachment, RLS, and keyset pagination tests.

create temporary table expense_test_state(name text primary key, value_uuid uuid not null);

-- Setup test trips and itinerary items for User A and User B
insert into public.trips(id, user_id, title, destination, start_date, end_date)
values
  ('81000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'Trip A1', 'Tokyo', '2028-04-01', '2028-04-05'),
  ('81000000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'Trip A2', 'Osaka', '2028-05-01', '2028-05-05'),
  ('81000000-0000-4000-8000-000000000003', '22222222-2222-4222-8222-222222222222', 'Trip B1', 'Seoul', '2028-06-01', '2028-06-05');

insert into public.itinerary_days(id, trip_id, day_number, date)
values
  ('81000000-0000-4000-8000-000000000011', '81000000-0000-4000-8000-000000000001', 1, '2028-04-01'),
  ('81000000-0000-4000-8000-000000000012', '81000000-0000-4000-8000-000000000002', 1, '2028-05-01'),
  ('81000000-0000-4000-8000-000000000013', '81000000-0000-4000-8000-000000000003', 1, '2028-06-01');

insert into public.itinerary_items(id, itinerary_day_id, position, place_name)
values
  ('81000000-0000-4000-8000-000000000021', '81000000-0000-4000-8000-000000000011', 1, 'Tokyo Tower'),
  ('81000000-0000-4000-8000-000000000022', '81000000-0000-4000-8000-000000000012', 1, 'Osaka Castle'),
  ('81000000-0000-4000-8000-000000000023', '81000000-0000-4000-8000-000000000013', 1, 'Gyeongbokgung');

insert into expense_test_state values
  ('trip_a1', '81000000-0000-4000-8000-000000000001'),
  ('trip_a2', '81000000-0000-4000-8000-000000000002'),
  ('trip_b1', '81000000-0000-4000-8000-000000000003'),
  ('item_a1', '81000000-0000-4000-8000-000000000021'),
  ('item_a2', '81000000-0000-4000-8000-000000000022'),
  ('item_b1', '81000000-0000-4000-8000-000000000023');

grant select on expense_test_state to authenticated;

-- 1. Anonymous Access Tests (Must be rejected with 42501 permission denied)
set role anon;

do $$
begin
  begin
    perform public.create_trip_expense('{}'::jsonb);
    raise exception 'Anonymous create_trip_expense should have been rejected.';
  exception when sqlstate '42501' then null; end;

  begin
    perform public.update_trip_expense('{}'::jsonb);
    raise exception 'Anonymous update_trip_expense should have been rejected.';
  exception when sqlstate '42501' then null; end;

  begin
    perform public.delete_trip_expense('81000000-0000-4000-8000-000000000001'::uuid);
    raise exception 'Anonymous delete_trip_expense should have been rejected.';
  exception when sqlstate '42501' then null; end;

  begin
    perform public.list_trip_expenses('81000000-0000-4000-8000-000000000001'::uuid);
    raise exception 'Anonymous list_trip_expenses should have been rejected.';
  exception when sqlstate '42501' then null; end;

  -- Direct table read and write by anon must be denied (42501)
  begin
    perform 1 from public.trip_expenses limit 1;
    raise exception 'Anonymous directly read trip_expenses rows.';
  exception when sqlstate '42501' then null; end;

  begin
    insert into public.trip_expenses(trip_id, category, origin, amount, currency, spent_at)
    values ('81000000-0000-4000-8000-000000000001', 'food', 'planned', 100, 'VND', now());
    raise exception 'Anonymous directly inserted trip_expenses row.';
  exception when sqlstate '42501' then null; end;
end
$$;
reset role;

-- 1b. Authenticated without JWT sub Tests (Must be rejected with 28000)
set role authenticated;
select set_config('request.jwt.claim.sub', '', false);

do $$
begin
  begin
    perform public.create_trip_expense('{}'::jsonb);
    raise exception 'JWT-less create_trip_expense should have been rejected.';
  exception when sqlstate '28000' then null; end;

  begin
    perform public.update_trip_expense('{}'::jsonb);
    raise exception 'JWT-less update_trip_expense should have been rejected.';
  exception when sqlstate '28000' then null; end;

  begin
    perform public.delete_trip_expense('81000000-0000-4000-8000-000000000001'::uuid);
    raise exception 'JWT-less delete_trip_expense should have been rejected.';
  exception when sqlstate '28000' then null; end;

  begin
    perform public.list_trip_expenses('81000000-0000-4000-8000-000000000001'::uuid);
    raise exception 'JWT-less list_trip_expenses should have been rejected.';
  exception when sqlstate '28000' then null; end;
end
$$;
reset role;

-- 2. Authenticated User A Operations
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', false);

do $$
declare
  v_trip_a1 uuid;
  v_trip_a2 uuid;
  v_trip_b1 uuid;
  v_item_a1 uuid;
  v_item_a2 uuid;
  v_item_b1 uuid;
  v_exp1 jsonb;
  v_exp2 jsonb;
  v_exp3 jsonb;
  v_exp4 jsonb;
  v_exp5 jsonb;
  v_updated jsonb;
  v_page jsonb;
  v_cursor jsonb;
  v_page2 jsonb;
  v_deleted boolean;
begin
  select value_uuid into v_trip_a1 from expense_test_state where name = 'trip_a1';
  select value_uuid into v_trip_a2 from expense_test_state where name = 'trip_a2';
  select value_uuid into v_trip_b1 from expense_test_state where name = 'trip_b1';
  select value_uuid into v_item_a1 from expense_test_state where name = 'item_a1';
  select value_uuid into v_item_a2 from expense_test_state where name = 'item_a2';
  select value_uuid into v_item_b1 from expense_test_state where name = 'item_b1';

  -- 2.1 Owner validation rejections
  -- Client supplied ownerId rejected
  begin
    perform public.create_trip_expense(jsonb_build_object(
      'tripId', v_trip_a1, 'category', 'food', 'origin', 'planned', 'amount', 100, 'currency', 'USD', 'ownerId', v_trip_a1
    ));
    raise exception 'Client-supplied ownerId should be rejected.';
  exception when sqlstate '22023' then null; end;

  -- Invalid category rejected
  begin
    perform public.create_trip_expense(jsonb_build_object(
      'tripId', v_trip_a1, 'category', 'gambling', 'origin', 'planned', 'amount', 100, 'currency', 'USD'
    ));
    raise exception 'Invalid category should be rejected.';
  exception when sqlstate '22023' then null; end;

  -- Invalid origin rejected
  begin
    perform public.create_trip_expense(jsonb_build_object(
      'tripId', v_trip_a1, 'category', 'food', 'origin', 'estimated', 'amount', 100, 'currency', 'USD'
    ));
    raise exception 'Invalid origin should be rejected.';
  exception when sqlstate '22023' then null; end;

  -- Zero or negative amount rejected
  begin
    perform public.create_trip_expense(jsonb_build_object(
      'tripId', v_trip_a1, 'category', 'food', 'origin', 'planned', 'amount', 0, 'currency', 'USD'
    ));
    raise exception 'Zero amount should be rejected.';
  exception when sqlstate '22023' then null; end;

  begin
    perform public.create_trip_expense(jsonb_build_object(
      'tripId', v_trip_a1, 'category', 'food', 'origin', 'planned', 'amount', -50, 'currency', 'USD'
    ));
    raise exception 'Negative amount should be rejected.';
  exception when sqlstate '22023' then null; end;

  -- Invalid currency rejected
  begin
    perform public.create_trip_expense(jsonb_build_object(
      'tripId', v_trip_a1, 'category', 'food', 'origin', 'planned', 'amount', 100, 'currency', 'usd'
    ));
    raise exception 'Lowercase currency should be rejected.';
  exception when sqlstate '22023' then null; end;

  -- Oversized note rejected (> 500 chars)
  begin
    perform public.create_trip_expense(jsonb_build_object(
      'tripId', v_trip_a1, 'category', 'food', 'origin', 'planned', 'amount', 100, 'currency', 'USD', 'note', repeat('x', 501)
    ));
    raise exception 'Oversized note should be rejected.';
  exception when sqlstate '22023' then null; end;

  -- Non-existent item attachment rejected
  begin
    perform public.create_trip_expense(jsonb_build_object(
      'tripId', v_trip_a1, 'category', 'food', 'origin', 'planned', 'amount', 100, 'currency', 'USD', 'itineraryItemId', gen_random_uuid()
    ));
    raise exception 'Non-existent item attachment should be rejected.';
  exception when sqlstate '22023' then null; end;

  -- Cross-trip attachment (same user, different trip item_a2 on trip_a1) rejected
  begin
    perform public.create_trip_expense(jsonb_build_object(
      'tripId', v_trip_a1, 'category', 'food', 'origin', 'planned', 'amount', 100, 'currency', 'USD', 'itineraryItemId', v_item_a2
    ));
    raise exception 'Cross-trip item attachment should be rejected.';
  exception when sqlstate '22023' then null; end;

  -- Cross-user attachment (User B item on User A trip) rejected
  begin
    perform public.create_trip_expense(jsonb_build_object(
      'tripId', v_trip_a1, 'category', 'food', 'origin', 'planned', 'amount', 100, 'currency', 'USD', 'itineraryItemId', v_item_b1
    ));
    raise exception 'Cross-user item attachment should be rejected.';
  exception when sqlstate '22023' then null; end;

  -- Cross-user trip insertion (User A creating on User B's trip) rejected
  begin
    perform public.create_trip_expense(jsonb_build_object(
      'tripId', v_trip_b1, 'category', 'food', 'origin', 'planned', 'amount', 100, 'currency', 'USD'
    ));
    raise exception 'Creating expense on other user trip should be rejected.';
  exception when sqlstate 'P0002' then null; end;

  -- 2.2 Valid Owner Creations
  -- Expense 1: planned, attached to item_a1
  v_exp1 := public.create_trip_expense(jsonb_build_object(
    'tripId', v_trip_a1,
    'category', 'ticket',
    'origin', 'planned',
    'amount', 3000.00,
    'currency', 'JPY',
    'note', 'Tokyo Tower Observation Deck',
    'spentAt', '2028-04-01T10:00:00Z',
    'itineraryItemId', v_item_a1
  ));
  if v_exp1->>'id' is null or (v_exp1->>'amount')::numeric <> 3000.00 or v_exp1->>'itineraryItemId' <> v_item_a1::text then
    raise exception 'Expense 1 creation failed.';
  end if;

  -- Expense 2: actual, food, unattached
  v_exp2 := public.create_trip_expense(jsonb_build_object(
    'tripId', v_trip_a1,
    'category', 'food',
    'origin', 'actual',
    'amount', 1500.50,
    'currency', 'JPY',
    'note', 'Ramen lunch',
    'spentAt', '2028-04-01T12:30:00Z'
  ));
  if v_exp2->>'id' is null or v_exp2->>'origin' <> 'actual' or v_exp2->>'itineraryItemId' is not null then
    raise exception 'Expense 2 creation failed.';
  end if;

  -- Expense 3: unplanned, shopping
  v_exp3 := public.create_trip_expense(jsonb_build_object(
    'tripId', v_trip_a1,
    'category', 'shopping',
    'origin', 'unplanned',
    'amount', 5000.00,
    'currency', 'JPY',
    'note', 'Souvenirs in Ginza'
  ));
  if v_exp3->>'origin' <> 'unplanned' or v_exp3->>'category' <> 'shopping' then
    raise exception 'Expense 3 creation failed.';
  end if;

  -- Expense 4: accommodation, planned
  v_exp4 := public.create_trip_expense(jsonb_build_object(
    'tripId', v_trip_a1,
    'category', 'accommodation',
    'origin', 'planned',
    'amount', 25000.00,
    'currency', 'JPY',
    'note', 'Hotel Shinjuku'
  ));

  -- Expense 5: transport, actual
  v_exp5 := public.create_trip_expense(jsonb_build_object(
    'tripId', v_trip_a1,
    'category', 'transport',
    'origin', 'actual',
    'amount', 800.00,
    'currency', 'JPY',
    'note', 'Metro pass'
  ));

  -- 2.3 Owner Update
  -- Cannot patch immutable fields (id, tripId)
  begin
    perform public.update_trip_expense(jsonb_build_object(
      'expenseId', v_exp1->>'id',
      'patch', jsonb_build_object('id', gen_random_uuid())
    ));
    raise exception 'Patching id must be rejected.';
  exception when sqlstate '22023' then null; end;

  begin
    perform public.update_trip_expense(jsonb_build_object(
      'expenseId', v_exp1->>'id',
      'patch', jsonb_build_object('tripId', v_trip_a2)
    ));
    raise exception 'Patching tripId must be rejected.';
  exception when sqlstate '22023' then null; end;

  -- Valid update: change amount, update note, detach item
  v_updated := public.update_trip_expense(jsonb_build_object(
    'expenseId', v_exp1->>'id',
    'patch', jsonb_build_object(
      'amount', 3200.00,
      'note', 'Updated observation deck price',
      'itineraryItemId', null
    )
  ));
  if (v_updated->>'amount')::numeric <> 3200.00
     or v_updated->>'note' <> 'Updated observation deck price'
     or v_updated->>'itineraryItemId' is not null then
    raise exception 'Expense update did not persist correctly.';
  end if;

  -- 2.4 Pagination via list_trip_expenses
  -- Invalid limit bounds
  begin
    perform public.list_trip_expenses(v_trip_a1, 0);
    raise exception 'Limit 0 must be rejected.';
  exception when sqlstate '22023' then null; end;

  begin
    perform public.list_trip_expenses(v_trip_a1, 51);
    raise exception 'Limit 51 must be rejected.';
  exception when sqlstate '22023' then null; end;

  -- Page 1: limit 2
  v_page := public.list_trip_expenses(v_trip_a1, 2);
  if jsonb_array_length(v_page->'items') <> 2 or v_page->'nextCursor' is null then
    raise exception 'Page 1 pagination failed: expected 2 items and a nextCursor.';
  end if;

  v_cursor := v_page->'nextCursor';

  -- Page 2: using nextCursor
  v_page2 := public.list_trip_expenses(
    v_trip_a1,
    2,
    (v_cursor->>'createdAt')::timestamptz,
    (v_cursor->>'id')::uuid
  );
  if jsonb_array_length(v_page2->'items') <> 2 or v_page2->'nextCursor' is null then
    raise exception 'Page 2 pagination failed: expected 2 items and a nextCursor.';
  end if;

  -- Verify no overlap between page 1 and page 2 items
  if (v_page->'items'->0->>'id') = (v_page2->'items'->0->>'id')
     or (v_page->'items'->1->>'id') = (v_page2->'items'->0->>'id') then
    raise exception 'Pagination returned duplicate rows across pages.';
  end if;

  -- Filter by category
  v_page := public.list_trip_expenses(v_trip_a1, 10, null, null, 'food');
  if jsonb_array_length(v_page->'items') <> 1 or (v_page->'items'->0->>'category') <> 'food' then
    raise exception 'Category filtering failed.';
  end if;

  -- Filter by origin
  v_page := public.list_trip_expenses(v_trip_a1, 10, null, null, null, 'unplanned');
  if jsonb_array_length(v_page->'items') <> 1 or (v_page->'items'->0->>'origin') <> 'unplanned' then
    raise exception 'Origin filtering failed.';
  end if;

  -- 2.5 Owner Delete
  v_deleted := public.delete_trip_expense((v_exp5->>'id')::uuid);
  if not v_deleted then
    raise exception 'Delete expense should return true.';
  end if;

  -- Deleting already-deleted expense returns false
  v_deleted := public.delete_trip_expense((v_exp5->>'id')::uuid);
  if v_deleted then
    raise exception 'Delete on non-existent expense should return false.';
  end if;
end
$$;

-- 3. Cross-User Isolation Tests (User B cannot access User A's expenses)
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', false);

do $$
declare
  v_trip_a1 uuid;
  v_trip_b1 uuid;
  v_page jsonb;
  v_deleted boolean;
begin
  select value_uuid into v_trip_a1 from expense_test_state where name = 'trip_a1';
  select value_uuid into v_trip_b1 from expense_test_state where name = 'trip_b1';

  -- User B cannot list User A's trip expenses
  begin
    perform public.list_trip_expenses(v_trip_a1, 10);
    raise exception 'User B listing User A expenses should fail with P0002.';
  exception when sqlstate 'P0002' then null; end;

  -- Direct table read by User B must NOT see User A's rows under RLS
  if exists (select 1 from public.trip_expenses where trip_id = v_trip_a1) then
    raise exception 'User B directly read User A trip expenses under RLS.';
  end if;

  -- User B cannot delete User A's expense
  v_deleted := public.delete_trip_expense('81000000-0000-4000-8000-000000000001'::uuid);
  if v_deleted then
    raise exception 'User B deleted User A expense.';
  end if;
end
$$;

-- 4. Direct Table Immutability Trigger Test
reset role;

do $$
declare
  v_exp_id uuid;
begin
  select id into v_exp_id from public.trip_expenses limit 1;
  begin
    update public.trip_expenses set id = gen_random_uuid() where id = v_exp_id;
    raise exception 'Direct update of id should fail by trigger.';
  exception when sqlstate '22023' then null; end;

  begin
    update public.trip_expenses set trip_id = gen_random_uuid() where id = v_exp_id;
    raise exception 'Direct update of trip_id should fail by trigger.';
  exception when sqlstate '22023' then null; end;
end
$$;

select 'expense_ledger_contract_pass' as result;
