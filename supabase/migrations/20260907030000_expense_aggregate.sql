-- FEATURE-P3-T002: bounded, original-currency accounting; no FX or budget writes.
create function public.get_trip_expense_aggregate(p_request jsonb)
returns jsonb
language plpgsql
stable
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_owner uuid := (select auth.uid());
  v_trip uuid;
  v_group text;
  v_limit integer := 20;
  v_cursor text;
  v_result jsonb;
begin
  if v_owner is null then
    raise exception 'Authentication is required.' using errcode='28000';
  end if;
  if p_request is null or jsonb_typeof(p_request) <> 'object'
     or p_request - array['tripId','groupBy','limit','cursor'] <> '{}'::jsonb then
    raise exception 'Invalid aggregate request.' using errcode='22023';
  end if;
  if jsonb_typeof(p_request->'tripId') is distinct from 'string' then
    raise exception 'Invalid trip ID.' using errcode='22023';
  end if;
  begin
    v_trip := (p_request->>'tripId')::uuid;
  exception when invalid_text_representation then
    raise exception 'Invalid trip ID.' using errcode='22023';
  end;
  v_group := p_request->>'groupBy';
  if v_group is null or v_group not in ('currency','category','day') then
    raise exception 'Invalid aggregate grouping.' using errcode='22023';
  end if;
  if p_request ? 'limit' then
    if jsonb_typeof(p_request->'limit') <> 'number' or (p_request->>'limit') !~ '^[0-9]{1,2}$' then
      raise exception 'Invalid aggregate limit.' using errcode='22023';
    end if;
    v_limit := (p_request->>'limit')::integer;
    if v_limit < 1 or v_limit > 50 then
      raise exception 'Invalid aggregate limit.' using errcode='22023';
    end if;
  end if;
  if p_request ? 'cursor' then
    v_cursor := p_request->>'cursor';
    if jsonb_typeof(p_request->'cursor') <> 'string' or length(v_cursor) not between 1 and 80
       or v_cursor !~ '^(c|k:(food|transport|accommodation|activity|shopping|ticket|personal|reservation|other)|i:[0-9a-f-]{36}|s:[0-9]{4}-[0-9]{2}-[0-9]{2}|u)[|][A-Z]{3}$'
       or (v_group='currency' and v_cursor !~ '^c[|]')
       or (v_group='category' and v_cursor !~ '^k:')
       or (v_group='day' and v_cursor !~ '^(i:|s:|u[|])') then
      raise exception 'Invalid aggregate cursor.' using errcode='22023';
    end if;
  end if;
  if not exists(select 1 from public.trips where id=v_trip and user_id=v_owner) then
    raise exception 'Trip not found.' using errcode='P0002';
  end if;

  -- One trip-filtered relation, two PK joins (day grouping only), one GROUP BY.
  -- RLS remains active on every relation. No per-expense/day SQL loop.
  with source as (
    select e.amount,e.origin,btrim(e.currency) as currency,
      case when v_group='category' then e.category end as category,
      case when v_group='day' then
        case when d.id is not null then 'itinerary' when e.spent_at is not null then 'spentDate' else 'unassigned' end
      end as day_kind,
      d.id as day_id,
      case when v_group='day' then case when d.id is not null then d.date else (e.spent_at at time zone 'UTC')::date end end as day_date,
      case v_group when 'currency' then 'c' when 'category' then 'k:'||e.category
        else case when d.id is not null then 'i:'||d.id::text
          when e.spent_at is not null then 's:'||to_char(e.spent_at at time zone 'UTC','YYYY-MM-DD') else 'u' end end
        ||'|'||btrim(e.currency) as group_key
    from public.trip_expenses e
    left join public.itinerary_items i on v_group='day' and i.id=e.itinerary_item_id
    left join public.itinerary_days d on d.id=i.itinerary_day_id and d.trip_id=e.trip_id
    where e.trip_id=v_trip
  ), totals as (
    select group_key,currency,category,day_kind,day_id,day_date,
      coalesce(sum(amount) filter(where origin='planned'),0)::numeric(24,2) as planned,
      coalesce(sum(amount) filter(where origin='actual'),0)::numeric(24,2) as actual,
      coalesce(sum(amount) filter(where origin='unplanned'),0)::numeric(24,2) as unplanned
    from source
    group by group_key,currency,category,day_kind,day_id,day_date
  ), page as materialized (
    select *, row_number() over(order by group_key collate "C") as rn
    from totals where v_cursor is null or group_key collate "C" > v_cursor collate "C"
    order by group_key collate "C" limit v_limit+1
  )
  select jsonb_build_object('tripId',v_trip,'groupBy',v_group,
    'items',coalesce(jsonb_agg(jsonb_build_object(
      'key',group_key,'currency',currency,'category',category,
      'day',case when day_kind is null then null else jsonb_build_object('kind',day_kind,'itineraryDayId',day_id,'date',day_date) end,
      'planned',planned::text,'actual',actual::text,'unplanned',unplanned::text,
      'actualPlusUnplanned',((actual+unplanned)::numeric(24,2))::text,
      'variance',((actual+unplanned-planned)::numeric(24,2))::text
    ) order by group_key collate "C") filter(where rn<=v_limit),'[]'::jsonb),
    'nextCursor',case when count(*)>v_limit then max(group_key) filter(where rn=v_limit) else null end)
  into v_result from page;
  return v_result;
exception when numeric_value_out_of_range then
  -- Fail closed above 22 integer digits; never truncate/saturate money.
  raise exception 'Aggregate amount exceeds supported bounds.' using errcode='22003';
end;
$$;
revoke all on function public.get_trip_expense_aggregate(jsonb) from public,anon;
grant execute on function public.get_trip_expense_aggregate(jsonb) to authenticated;
