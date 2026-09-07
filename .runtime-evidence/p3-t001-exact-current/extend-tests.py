from pathlib import Path
p = Path('supabase/tests/persistence/expense_ledger_contract.sql')
s = p.read_text()
s = s.replace("'expenseId', v_exp1->>'id',", "'tripId', v_trip_a1, 'expenseId', v_exp1->>'id',")
s = s.replace("public.delete_trip_expense('81000000-0000-4000-8000-000000000001'::uuid)", "public.delete_trip_expense('81000000-0000-4000-8000-000000000001'::uuid, '81000000-0000-4000-8000-000000000001'::uuid)")
s = s.replace("public.delete_trip_expense((v_exp5->>'id')::uuid)", "public.delete_trip_expense(v_trip_a1, (v_exp5->>'id')::uuid)")
block = r"""
-- Corrective regressions run in a later transaction than creation, so now()
-- differs from the stored updated_at and a silent no-op UPDATE is detectable.
do $$
declare
  v_trip uuid := '81000000-0000-4000-8000-000000000001';
  v_wrong_trip uuid := '81000000-0000-4000-8000-000000000002';
  v_before public.trip_expenses%rowtype;
  v_key text;
  v_bad jsonb;
  v_cmd jsonb;
  v_result jsonb;
  v_page jsonb;
  v_cursor jsonb;
  v_ids uuid[] := '{}';
  v_id uuid;
  v_created timestamptz;
  v_updated timestamptz;
begin
  select * into strict v_before from public.trip_expenses
    where trip_id = v_trip order by created_at desc, id desc limit 1;
  v_cmd := jsonb_build_object('tripId',v_trip,'category','food','origin','actual','amount',10,'currency','USD');
  foreach v_key in array array['unexpected','provider','googlePlaceId','ownerId','userId','id','createdAt','updatedAt'] loop
    begin
      perform public.create_trip_expense(v_cmd || jsonb_build_object(v_key, 'forged'));
      raise exception 'Create accepted unsupported key: %', v_key;
    exception when sqlstate '22023' then null; end;
    begin
      perform public.update_trip_expense(jsonb_build_object('tripId',v_trip,'expenseId',v_before.id,'patch',jsonb_build_object('amount',12),v_key,'forged'));
      raise exception 'Update accepted unsupported top-level key: %', v_key;
    exception when sqlstate '22023' then null; end;
    begin
      perform public.update_trip_expense(jsonb_build_object('tripId',v_trip,'expenseId',v_before.id,'patch',jsonb_build_object('amount',12,v_key,'forged')));
      raise exception 'Update accepted mixed unsupported patch key: %', v_key;
    exception when sqlstate '22023' then null; end;
  end loop;
  foreach v_bad in array array['{}'::jsonb,'{"arbitrary":1}'::jsonb,'[]'::jsonb,'null'::jsonb,'"text"'::jsonb] loop
    begin
      perform public.update_trip_expense(jsonb_build_object('tripId',v_trip,'expenseId',v_before.id,'patch',v_bad));
      raise exception 'Invalid/empty/unknown-only patch accepted: %', v_bad;
    exception when sqlstate '22023' then null; end;
  end loop;
  foreach v_bad in array array['null'::jsonb,'"invalid"'::jsonb] loop
    begin
      perform public.update_trip_expense(jsonb_build_object('tripId',v_bad,'expenseId',v_before.id,'patch',jsonb_build_object('amount',12)));
      raise exception 'Invalid tripId accepted.';
    exception when sqlstate '22023' then null; end;
  end loop;
  begin
    perform public.update_trip_expense(jsonb_build_object('expenseId',v_before.id,'patch',jsonb_build_object('amount',12)));
    raise exception 'Missing tripId accepted.';
  exception when sqlstate '22023' then null; end;
  foreach v_key in array array['', '   ', E'\t\n\r', U&'\00A0\2003\FEFF'] loop
    begin
      perform public.create_trip_expense(v_cmd || jsonb_build_object('note',v_key));
      raise exception 'Blank create note accepted.';
    exception when sqlstate '22023' then null; end;
    begin
      perform public.update_trip_expense(jsonb_build_object('tripId',v_trip,'expenseId',v_before.id,'patch',jsonb_build_object('note',v_key)));
      raise exception 'Blank update note silently cleared.';
    exception when sqlstate '22023' then null; end;
  end loop;
  begin
    perform public.update_trip_expense(jsonb_build_object('tripId',v_wrong_trip,'expenseId',v_before.id,'patch',jsonb_build_object('amount',12)));
    raise exception 'Same-owner wrong-trip update succeeded.';
  exception when sqlstate 'P0002' then null; end;
  if public.delete_trip_expense(v_wrong_trip,v_before.id) then
    raise exception 'Same-owner wrong-trip delete succeeded.';
  end if;
  if not exists (select 1 from public.trip_expenses e where e.id=v_before.id and e.updated_at=v_before.updated_at and e.amount=v_before.amount and e.note is not distinct from v_before.note) then
    raise exception 'Rejected patches/wrong-trip writes changed expense or updated_at.';
  end if;
  -- Each protected column must reject direct INSERT and UPDATE independently.
  foreach v_key in array array['id','created_at','updated_at'] loop
    begin
      execute format('update public.trip_expenses set %I = %s where id=$1',v_key,
        case when v_key='id' then 'gen_random_uuid()' else '''2001-01-01''::timestamptz' end) using v_before.id;
      raise exception 'Direct authenticated UPDATE forged %', v_key;
    exception when sqlstate '42501' then null; end;
    begin
      execute format('insert into public.trip_expenses(trip_id,category,origin,amount,currency,%I) values ($1,''food'',''actual'',1,''USD'',%s)',v_key,
        case when v_key='id' then 'gen_random_uuid()' else '''2001-01-01''::timestamptz' end) using v_trip;
      raise exception 'Direct authenticated INSERT forged %', v_key;
    exception when sqlstate '42501' then null; end;
  end loop;
  -- Allowed direct CRUD still works under invoker column grants; timestamps generated by server.
  insert into public.trip_expenses(trip_id,category,origin,amount,currency)
    values(v_trip,'food','actual',1,'USD') returning id,created_at,updated_at into v_id,v_created,v_updated;
  if v_id is null or v_created <> now() or v_updated <> now() then
    raise exception 'Direct insert server defaults failed.';
  end if;
  update public.trip_expenses set note='Allowed owner update' where id=v_before.id returning updated_at into v_updated;
  if v_updated <> now() or v_updated <= v_before.updated_at then
    raise exception 'Allowed direct update did not set server time.';
  end if;
  delete from public.trip_expenses where id=v_id;
  v_result := public.update_trip_expense(jsonb_build_object('tripId',v_trip,'expenseId',v_before.id,'patch',jsonb_build_object('note',null)));
  if v_result->>'note' is not null or (v_result->>'id')::uuid <> v_before.id
     or (v_result->>'createdAt')::timestamptz <> v_before.created_at then
    raise exception 'Correct-context update/null clear/stable cursor failed.';
  end if;
  -- Visit every page after hardening and mutation; exact set, no duplicates, terminal cursor.
  loop
    v_page := public.list_trip_expenses(v_trip,1,(v_cursor->>'createdAt')::timestamptz,(v_cursor->>'id')::uuid);
    for v_id in select (item->>'id')::uuid from jsonb_array_elements(v_page->'items') item loop
      if v_id=any(v_ids) then raise exception 'Duplicate pagination row.'; end if;
      v_ids := array_append(v_ids,v_id);
    end loop;
    v_cursor := nullif(v_page->'nextCursor','null'::jsonb);
    exit when v_cursor is null;
    if cardinality(v_ids)>50 then raise exception 'Pagination did not terminate.'; end if;
  end loop;
  if cardinality(v_ids) <> (select count(*) from public.trip_expenses where trip_id=v_trip) then
    raise exception 'Pagination omitted rows after audit hardening.';
  end if;
  v_result := public.create_trip_expense(v_cmd || '{"note":null}'::jsonb);
  if not public.delete_trip_expense(v_trip,(v_result->>'id')::uuid)
     or exists(select 1 from public.trip_expenses where id=(v_result->>'id')::uuid) then
    raise exception 'Correct-context delete failed.';
  end if;
end
$$;
select 'expense_strict_keys_trip_binding_audit_pagination_pass' as result;

-- Preserve a real owner expense ID for cross-user tests (not a non-existent trip ID).
reset role;
insert into expense_test_state select 'expense_a1',id from public.trip_expenses
  where trip_id='81000000-0000-4000-8000-000000000001' limit 1;
set role authenticated;
"""
s=s.replace('-- 3. Cross-User Isolation Tests',block+'\n-- 3. Cross-User Isolation Tests')
s=s.replace("v_deleted := public.delete_trip_expense('81000000-0000-4000-8000-000000000001'::uuid, '81000000-0000-4000-8000-000000000001'::uuid);", "v_deleted := public.delete_trip_expense(v_trip_a1, (select value_uuid from expense_test_state where name='expense_a1'));")
cross=r"""
  begin
    perform public.update_trip_expense(jsonb_build_object('tripId',v_trip_a1,'expenseId',(select value_uuid from expense_test_state where name='expense_a1'),'patch',jsonb_build_object('amount',999)));
    raise exception 'Cross-user update succeeded.';
  exception when sqlstate 'P0002' then null; end;
  begin
    insert into public.trip_expenses(trip_id,category,origin,amount,currency) values(v_trip_a1,'food','actual',1,'USD');
    raise exception 'Cross-user direct insert succeeded.';
  exception when sqlstate '42501' then null; end;
  update public.trip_expenses set amount=999 where trip_id=v_trip_a1;
  if found then raise exception 'Cross-user direct UPDATE bypassed RLS.'; end if;
  delete from public.trip_expenses where trip_id=v_trip_a1;
  if found then raise exception 'Cross-user direct DELETE bypassed RLS.'; end if;
"""
s=s.replace('  -- User B cannot delete User A\'s expense',cross+"\n  -- User B cannot delete User A's expense")
s=s.replace("select 'expense_ledger_contract_pass' as result;", """do $$
begin
  if to_regprocedure('public.delete_trip_expense(uuid)') is not null then
    raise exception 'Legacy delete bypass still exists.';
  end if;
  if exists(select 1 from pg_proc where oid in (
    'public.create_trip_expense(jsonb)'::regprocedure,
    'public.update_trip_expense(jsonb)'::regprocedure,
    'public.delete_trip_expense(uuid,uuid)'::regprocedure,
    'public.list_trip_expenses(uuid,integer,timestamptz,uuid,text,text)'::regprocedure) and prosecdef) then
    raise exception 'Expense RPC elevated authority.';
  end if;
end
$$;
drop table expense_test_state;
select 'expense_ledger_contract_pass' as result;""")
p.write_text(s,encoding='utf-8')
