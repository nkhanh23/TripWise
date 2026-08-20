create schema tripwise_private;

revoke all on schema tripwise_private from public, anon;
grant usage on schema tripwise_private to authenticated;

alter function public.create_trip_graph(text, jsonb)
  set schema tripwise_private;

revoke all on function tripwise_private.create_trip_graph(text, jsonb) from public, anon;
grant execute on function tripwise_private.create_trip_graph(text, jsonb) to authenticated;

comment on function tripwise_private.create_trip_graph(text, jsonb) is
  'Internal SECURITY INVOKER implementation for validated, idempotent and atomic trip-graph creation. Public callers use public.create_trip_graph(text, jsonb).';

create function public.create_trip_graph(p_idempotency_key text, p_graph jsonb)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_constraint_name text;
begin
  begin
    return tripwise_private.create_trip_graph(p_idempotency_key, p_graph);
  exception
    when invalid_authorization_specification then
      raise exception using
        errcode = 'TW002',
        message = 'Authentication is required.';
    when data_exception then
      raise exception using
        errcode = 'TW001',
        message = 'Trip persistence input is invalid.';
    when unique_violation then
      get stacked diagnostics v_constraint_name = constraint_name;

      if coalesce(v_constraint_name, '') = '' then
        raise exception using
          errcode = 'TW004',
          message = 'The idempotency key is already associated with a different request.';
      end if;

      raise exception using
        errcode = 'TW005',
        message = 'Unable to persist trip.';
    when insufficient_privilege then
      raise exception using
        errcode = 'TW003',
        message = 'Trip persistence is not permitted.';
    when integrity_constraint_violation then
      raise exception using
        errcode = 'TW005',
        message = 'Unable to persist trip.';
    when others then
      raise exception using
        errcode = 'TW005',
        message = 'Unable to persist trip.';
  end;
end;
$$;

comment on function public.create_trip_graph(text, jsonb) is
  'Stable trip-persistence boundary. Returns UUID on success and raises TW001 validation, TW002 unauthenticated, TW003 forbidden, TW004 idempotency conflict, or TW005 unexpected database failure without exposing internal details.';

revoke all on function public.create_trip_graph(text, jsonb) from public, anon;
grant execute on function public.create_trip_graph(text, jsonb) to authenticated;
