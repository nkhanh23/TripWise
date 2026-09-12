-- Read-only catalog evidence. No role switch, DML or functional RPC invocation.
select current_setting('server_version') as server_version,
  c.relacl::text as actual_acl,
  c.relrowsecurity as rls_enabled,
  (select jsonb_object_agg(p.privilege_type,
    has_table_privilege('authenticated', c.oid, p.privilege_type))
    from aclexplode(acldefault('r', c.relowner)) p) as authenticated_effective_privileges,
  (select jsonb_object_agg(p.privilege_type,
    has_table_privilege('anon', c.oid, p.privilege_type))
    from aclexplode(acldefault('r', c.relowner)) p) as anon_effective_privileges,
  not exists(select 1 from aclexplode(c.relacl) where grantee=0) as no_public_table_grants,
  (select jsonb_agg(jsonb_build_object('name',policyname,'roles',roles,'command',cmd,'using',qual,'withCheck',with_check))
    from pg_policies where schemaname='public' and tablename=c.relname) as policies,
  has_function_privilege('authenticated','public.apply_trip_refresh(jsonb)','EXECUTE') as authenticated_rpc_execute,
  has_function_privilege('anon','public.apply_trip_refresh(jsonb)','EXECUTE') as anon_rpc_execute,
  (select not prosecdef from pg_proc where oid='public.apply_trip_refresh(jsonb)'::regprocedure) as rpc_security_invoker,
  (select jsonb_agg(jsonb_build_object('owner',pg_get_userbyid(d.defaclrole),'acl',d.defaclacl::text))
    from pg_default_acl d where d.defaclnamespace='public'::regnamespace and d.defaclobjtype='r') as unchanged_project_default_acls
from pg_class c where c.oid='public.trip_refresh_apply_idempotency'::regclass;
