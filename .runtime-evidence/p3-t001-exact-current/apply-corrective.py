from pathlib import Path

root = Path.cwd()
def edit(path, old, new):
    p = root / path
    s = p.read_text(encoding='utf-8-sig')
    assert old in s, (path, old)
    p.write_text(s.replace(old, new), encoding='utf-8', newline='\n')

base = (root / 'supabase/migrations/20260907010000_expense_ledger_foundation.sql').read_text()
rpc = base[base.index('-- RPC: create_trip_expense'):base.index('-- RPC: list_trip_expenses')]
old = "if p_command ? 'ownerId' or p_command ? 'userId' then\n    raise exception 'Owner identity cannot be supplied by client.' using errcode = '22023';"
rpc = rpc.replace(old, "if (p_command - array['tripId','category','origin','amount','currency','note','spentAt','itineraryItemId']) <> '{}'::jsonb then\n    raise exception 'Unsupported expense command field.' using errcode = '22023';", 1)
rpc = rpc.replace(old, "if (p_command - array['expenseId','tripId','patch']) <> '{}'::jsonb then\n    raise exception 'Unsupported expense command field.' using errcode = '22023';", 1)
rpc = rpc.replace("v_note := nullif(btrim(p_command->>'note'), '');", "v_note := btrim(p_command->>'note', E' \\t\\n\\r\\f\\v' || U&'\\00A0\\1680\\2000\\2001\\2002\\2003\\2004\\2005\\2006\\2007\\2008\\2009\\200A\\2028\\2029\\202F\\205F\\3000\\FEFF');")
rpc = rpc.replace("v_note := nullif(btrim(v_patch->>'note'), '');", "v_note := btrim(v_patch->>'note', E' \\t\\n\\r\\f\\v' || U&'\\00A0\\1680\\2000\\2001\\2002\\2003\\2004\\2005\\2006\\2007\\2008\\2009\\200A\\2028\\2029\\202F\\205F\\3000\\FEFF');")
rpc = rpc.replace('if v_note is not null and (length(v_note) < 1 or length(v_note) > 500) then', 'if length(v_note) < 1 or length(v_note) > 500 then')
rpc = rpc.replace('  -- Load existing expense and verify ownership via trip', """  begin
    v_trip_id := (p_command->>'tripId')::uuid;
  exception when invalid_text_representation then
    raise exception 'Trip ID is invalid.' using errcode = '22023';
  end;
  if v_trip_id is null then
    raise exception 'Trip ID is required.' using errcode = '22023';
  end if;

  -- Bind the row to the supplied trip and owner; serialize read/patch/write.
  -- Load existing expense and verify ownership via trip""")
rpc = rpc.replace('and t.user_id = v_user_id;', 'and e.trip_id = v_trip_id\n    and t.user_id = v_user_id\n  for update of e;')
rpc = rpc.replace("if v_patch is null or jsonb_typeof(v_patch) <> 'object' then", "if v_patch is null or jsonb_typeof(v_patch) <> 'object' or v_patch = '{}'::jsonb then")
rpc = rpc.replace("if v_patch ? 'id' or v_patch ? 'tripId' or v_patch ? 'ownerId' or v_patch ? 'userId' then", "if (v_patch - array['category','origin','amount','currency','note','spentAt','itineraryItemId']) <> '{}'::jsonb then")
rpc = rpc.replace('where id = v_expense_id\n  returning', 'where id = v_expense_id and trip_id = v_trip_id\n  returning')
rpc = rpc.replace('public.delete_trip_expense(p_expense_id uuid)', 'public.delete_trip_expense(p_trip_id uuid, p_expense_id uuid)')
rpc = rpc.replace('if p_expense_id is null then', 'if p_trip_id is null or p_expense_id is null then')
rpc = rpc.replace('where id = p_expense_id\n', 'where id = p_expense_id\n    and trip_id = p_trip_id\n')
rpc = rpc.replace('public.delete_trip_expense(uuid)', 'public.delete_trip_expense(uuid, uuid)')
header = """-- FEATURE-P3-T001 corrective: strict JSON, trip binding, server-owned audit fields.
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

"""
(root / 'supabase/migrations/20260907020000_expense_ledger_contract_corrective.sql').write_text(header + rpc, encoding='utf-8')
edit('mobile/src/integration/remote/supabaseTripExpenseRepository.ts', 'p_expense_id: validated.expenseId,', 'p_trip_id: validated.tripId,\n            p_expense_id: validated.expenseId,')
edit('mobile/src/lib/supabase/database.types.ts', 'delete_trip_expense: { Args: { p_expense_id: string }', 'delete_trip_expense: { Args: { p_trip_id: string; p_expense_id: string }')
edit('mobile/tests/expense-ledger-contract.test.ts', "{ p_expense_id: expenseId }", "{ p_trip_id: tripId, p_expense_id: expenseId }")
edit('supabase/tests/persistence/upgrade_verify.sql', 'public.delete_trip_expense(uuid)', 'public.delete_trip_expense(uuid,uuid)')
edit('supabase/tests/persistence/run.ps1', "  Write-Output 'PERSISTENCE_TESTS_PASS'", "  Invoke-SqlFile -Database $upgradeDb -Path (Join-Path $PSScriptRoot 'expense_ledger_contract.sql')\n\n  Write-Output 'PERSISTENCE_TESTS_PASS'")
edit('phase_doc/PHASES_FEATURES.md', '[x] FEATURE-P3-T001', '[ ] FEATURE-P3-T001')
edit('phase_doc/PHASES_FEATURES.md', '[x] RLS theo owner, category/origin validation và pagination PASS.', '[ ] RLS theo owner, category/origin validation và pagination PASS.')
edit('phase_doc/PHASES_FEATURES.md', '**Trạng thái:** COMPLETE — Subtask S001 hoàn thành.', '**Trạng thái:** NEEDS_FIX — corrective closure đang chờ exact-current gates.')
