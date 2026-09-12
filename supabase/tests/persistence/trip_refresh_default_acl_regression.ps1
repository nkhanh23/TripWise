# Runs only inside the disposable persistence container. Never targets linked DBs.
$aclDb = 'tripwise_refresh_default_acl'
$originalRefresh = '20260911000000_apply_trip_refresh_atomic.sql'
$aclCorrective = '20260911161103_harden_trip_refresh_idempotency_acl.sql'
Invoke-SqlText -Database $freshDb -Sql "create database $aclDb;"
Invoke-SqlFile -Database $aclDb -Path (Join-Path $PSScriptRoot 'bootstrap.sql')
foreach ($migration in $migrations | Where-Object Name -LE $originalRefresh) {
  if ($migration.Name -eq $originalRefresh) {
    # Database-local reproduction of the remote creation-time condition only.
    Invoke-SqlText -Database $aclDb -Sql 'alter default privileges for role postgres in schema public grant all privileges on tables to authenticated;'
  }
  Invoke-SqlFile -Database $aclDb -Path $migration.FullName
}
Invoke-SqlText -Database $aclDb -Sql @'
do $$
begin
  if not has_table_privilege('authenticated','public.trip_refresh_apply_idempotency','INSERT')
     or not has_table_privilege('authenticated','public.trip_refresh_apply_idempotency','UPDATE')
     or not has_table_privilege('authenticated','public.trip_refresh_apply_idempotency','DELETE')
     or not has_table_privilege('authenticated','public.trip_refresh_apply_idempotency','TRUNCATE') then
    raise exception 'Remote default ACL defect was not reproduced before corrective.';
  end if;
end;
$$;
select 'trip_refresh_remote_default_acl_defect_reproduced' as result;
'@
Invoke-SqlFile -Database $aclDb -Path (Join-Path $migrationRoot $aclCorrective)
Invoke-SqlFile -Database $aclDb -Path (Join-Path $PSScriptRoot 'trip_refresh_apply_contract.sql')
Write-Output 'trip_refresh_remote_default_acl_corrective_pass'
