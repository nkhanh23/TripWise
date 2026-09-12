-- FEATURE-P5-T004: remove grants inherited at table creation from remote
-- default ACLs, including version-specific privileges such as MAINTAIN.
-- Preserve rows, RLS, owner SELECT policy and the existing RPC writer path.
revoke all privileges
on table public.trip_refresh_apply_idempotency
from authenticated;

grant select
on table public.trip_refresh_apply_idempotency
to authenticated;
