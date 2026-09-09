-- FEATURE-P3-T003: read the original budget without binary-float transport.
-- No trip/expense writes, no destination guessing, no provider credentials.
create or replace function public.get_trip_fx_context(p_request jsonb)
returns jsonb language plpgsql stable security invoker
set search_path = pg_catalog, public
as $$
declare
  v_owner uuid := (select auth.uid());
  v_trip uuid;
  v_result jsonb;
begin
  if v_owner is null then raise exception 'Authentication required.' using errcode='28000'; end if;
  if p_request is null or jsonb_typeof(p_request)<>'object'
     or p_request - array['tripId'] <> '{}'::jsonb
     or jsonb_typeof(p_request->'tripId') is distinct from 'string' then
    raise exception 'Invalid FX context request.' using errcode='22023';
  end if;
  begin v_trip := (p_request->>'tripId')::uuid;
  exception when invalid_text_representation then raise exception 'Invalid trip ID.' using errcode='22023'; end;
  select jsonb_build_object('tripId',t.id,
    'originalBudget',jsonb_build_object('amount',t.estimated_budget::text,'currency',btrim(t.currency)),
    'homeCurrency',btrim(t.currency),
    'homeCurrencySource','originalBudget',
    'destinationCurrency',null,'destinationCurrencySource','unavailable')
    into v_result from public.trips t where t.id=v_trip and t.user_id=v_owner;
  if not found then raise exception 'Trip not found.' using errcode='P0002'; end if;
  return v_result;
end $$;
revoke all on function public.get_trip_fx_context(jsonb) from public,anon;
grant execute on function public.get_trip_fx_context(jsonb) to authenticated;
