[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

# Keep Docker from reading a desktop config that may be ACL-restricted in CI/sandboxes.
$dockerConfig = Join-Path ([System.IO.Path]::GetTempPath()) 'tripwise-docker-config'
New-Item -ItemType Directory -Path $dockerConfig -Force | Out-Null
$env:DOCKER_CONFIG = $dockerConfig

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
$migrationRoot = Join-Path $repoRoot 'supabase\migrations'
$container = 'tripwise-persistence-tests'
$image = 'postgis/postgis:16-3.4-alpine'
$freshDb = 'tripwise_fresh'
$upgradeDb = 'tripwise_upgrade'

function Invoke-Docker {
  param([Parameter(Mandatory)][string[]]$Arguments)
  & docker @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "docker command failed with exit code $LASTEXITCODE"
  }
}

function Invoke-SqlFile {
  param(
    [Parameter(Mandatory)][string]$Database,
    [Parameter(Mandatory)][string]$Path
  )
  Get-Content -LiteralPath $Path -Raw |
    docker exec -i $container psql -X -v ON_ERROR_STOP=1 -U postgres -d $Database
  if ($LASTEXITCODE -ne 0) {
    throw "SQL file failed: $Path"
  }
}

function Invoke-SqlText {
  param(
    [Parameter(Mandatory)][string]$Database,
    [Parameter(Mandatory)][string]$Sql
  )
  $Sql | docker exec -i $container psql -X -v ON_ERROR_STOP=1 -U postgres -d $Database
  if ($LASTEXITCODE -ne 0) {
    throw 'Inline SQL failed.'
  }
}

function Start-ConcurrentSql {
  param([Parameter(Mandatory)][string]$Sql)
  Start-Job -ScriptBlock {
    param($ContainerName, $DatabaseName, $Statement)
    $output = $Statement | docker exec -i $ContainerName psql -X -v ON_ERROR_STOP=1 -U postgres -d $DatabaseName 2>&1
    if ($LASTEXITCODE -ne 0) {
      throw ($output -join [Environment]::NewLine)
    }
    $output -join [Environment]::NewLine
  } -ArgumentList $container, $freshDb, $Sql
}

if ($container -ne 'tripwise-persistence-tests') {
  throw 'Unexpected container target.'
}

try {
  $existing = docker ps -a --filter "name=^/$container$" --format '{{.Names}}'
  if ($existing -eq $container) {
    Invoke-Docker -Arguments @('rm', '-f', $container)
  }

  Invoke-Docker -Arguments @(
    'run', '--detach', '--name', $container,
    '--env', 'POSTGRES_PASSWORD=tripwise_test_only',
    '--env', "POSTGRES_DB=$freshDb",
    $image
  )

  $ready = $false
  for ($attempt = 1; $attempt -le 45; $attempt++) {
    & docker exec $container pg_isready -U postgres -d $freshDb *> $null
    $databaseReady = $LASTEXITCODE -eq 0
    $mainProcess = (& docker exec $container sh -c 'cat /proc/1/comm' 2>$null)
    if ($databaseReady -and $LASTEXITCODE -eq 0 -and $mainProcess.Trim() -eq 'postgres') {
      $ready = $true
      break
    }
    Start-Sleep -Seconds 1
  }
  if (-not $ready) {
    throw 'PostgreSQL test container did not become ready.'
  }

  Invoke-SqlFile -Database $freshDb -Path (Join-Path $PSScriptRoot 'bootstrap.sql')
  $migrations = Get-ChildItem -LiteralPath $migrationRoot -Filter '*.sql' | Sort-Object Name
  foreach ($migration in $migrations) {
    Invoke-SqlFile -Database $freshDb -Path $migration.FullName
  }
  Invoke-SqlFile -Database $freshDb -Path (Join-Path $PSScriptRoot 'contract.sql')
  Invoke-SqlFile -Database $freshDb -Path (Join-Path $repoRoot 'supabase\tests\saved-trips\contract.sql')
  Invoke-SqlFile -Database $freshDb -Path (Join-Path $PSScriptRoot 'workspace_mutation_contract.sql')
  Invoke-SqlFile -Database $freshDb -Path (Join-Path $PSScriptRoot 'workspace_move_contract.sql')
  Invoke-SqlFile -Database $freshDb -Path (Join-Path $PSScriptRoot 'workspace_security_matrix.sql')
  Invoke-SqlFile -Database $freshDb -Path (Join-Path $PSScriptRoot 'expense_ledger_contract.sql')

  # P2-T001: two authenticated append commands begin from the same revision.
  # The trip-row CAS lock must serialize them: exactly one append commits and
  # the other returns TW009, leaving a contiguous, authoritative final state.
  Invoke-SqlText -Database $freshDb -Sql @"
insert into public.trips(id,user_id,title,destination,start_date,end_date)
values('99999999-9999-4999-8999-999999999951','11111111-1111-4111-8111-111111111111','Create race','Hue','2027-11-04','2027-11-04');
insert into public.itinerary_days(id,trip_id,day_number,date)
values('99999999-9999-4999-8999-999999999952','99999999-9999-4999-8999-999999999951',1,'2027-11-04');
insert into public.itinerary_items(id,itinerary_day_id,position,place_name)
values('99999999-9999-4999-8999-999999999953','99999999-9999-4999-8999-999999999952',1,'Existing item');
"@
  $createRaceTemplate = @"
set statement_timeout = '3000ms';
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
do `$block`$
begin
  begin
    perform public.create_travel_workspace_item(jsonb_build_object(
      'type','create_item','tripId','99999999-9999-4999-8999-999999999951',
      'dayId','99999999-9999-4999-8999-999999999952','expectedRevision',3,
      'item',jsonb_build_object('itemKind','custom_activity','title','%TITLE%',
        'flexibility','fixed','priority','must_do')));
    raise notice 'CREATE_ITEM_RACE=SUCCESS';
  exception when sqlstate 'TW009' then
    raise notice 'CREATE_ITEM_RACE=TW009';
  end;
end
`$block`$;
"@
  $createRaceA = Start-ConcurrentSql -Sql ($createRaceTemplate.Replace('%TITLE%','Race A'))
  Start-Sleep -Milliseconds 100
  $createRaceB = Start-ConcurrentSql -Sql ($createRaceTemplate.Replace('%TITLE%','Race B'))
  $completedCreateRaceJobs = Wait-Job -Job $createRaceA, $createRaceB -Timeout 10
  if ($completedCreateRaceJobs.Count -ne 2) {
    Remove-Job -Job $createRaceA, $createRaceB -Force
    throw 'Create-item concurrency test exceeded bounded timeout.'
  }
  $createRaceOutput = ((Receive-Job -Job $createRaceA) + (Receive-Job -Job $createRaceB)) -join "`n"
  Remove-Job -Job $createRaceA, $createRaceB
  if (([regex]::Matches($createRaceOutput, 'CREATE_ITEM_RACE=SUCCESS')).Count -ne 1 -or
      ([regex]::Matches($createRaceOutput, 'CREATE_ITEM_RACE=TW009')).Count -ne 1) {
    throw "Create-item race was not one success plus one TW009 conflict.`n$createRaceOutput"
  }
  Invoke-SqlText -Database $freshDb -Sql @"
do `$`$
begin
  if (select workspace_revision from public.trips where id='99999999-9999-4999-8999-999999999951') <> 4
     or (select count(*) from public.itinerary_items where itinerary_day_id='99999999-9999-4999-8999-999999999952') <> 2
     or exists (
       select 1 from public.itinerary_items where itinerary_day_id='99999999-9999-4999-8999-999999999952'
       group by itinerary_day_id having array_agg(position order by position) <> array[1,2]
     ) then
    raise exception 'Create-item race did not leave one contiguous authoritative append.';
  end if;
end
`$`$;
"@
  Write-Output 'workspace_create_item_concurrency_pass'

  # P2-T002: three independent multi-session races cover same-item moves,
  # different-item same-day reorders, and cross-day competition. Each pair
  # starts from its exact initial revision; bounded waits prove no lock cycle.
  Invoke-SqlText -Database $freshDb -Sql @"
insert into public.trips(id,user_id,title,destination,start_date,end_date) values
('99999999-9999-4999-8999-999999999961','11111111-1111-4111-8111-111111111111','Move same item','Hue','2027-11-05','2027-11-06'),
('99999999-9999-4999-8999-999999999971','11111111-1111-4111-8111-111111111111','Move different','Hue','2027-11-07','2027-11-07'),
('99999999-9999-4999-8999-999999999981','11111111-1111-4111-8111-111111111111','Move cross day','Hue','2027-11-08','2027-11-09');
insert into public.itinerary_days(id,trip_id,day_number,date) values
('99999999-9999-4999-8999-999999999962','99999999-9999-4999-8999-999999999961',1,'2027-11-05'),('99999999-9999-4999-8999-999999999963','99999999-9999-4999-8999-999999999961',2,'2027-11-06'),
('99999999-9999-4999-8999-999999999972','99999999-9999-4999-8999-999999999971',1,'2027-11-07'),
('99999999-9999-4999-8999-999999999982','99999999-9999-4999-8999-999999999981',1,'2027-11-08'),('99999999-9999-4999-8999-999999999983','99999999-9999-4999-8999-999999999981',2,'2027-11-09');
insert into public.itinerary_items(id,itinerary_day_id,position,place_name) values
('99999999-9999-4999-8999-999999999964','99999999-9999-4999-8999-999999999962',1,'Same A'),('99999999-9999-4999-8999-999999999965','99999999-9999-4999-8999-999999999962',2,'Same B'),('99999999-9999-4999-8999-999999999966','99999999-9999-4999-8999-999999999963',1,'Same C'),
('99999999-9999-4999-8999-999999999973','99999999-9999-4999-8999-999999999972',1,'Different A'),('99999999-9999-4999-8999-999999999974','99999999-9999-4999-8999-999999999972',2,'Different B'),('99999999-9999-4999-8999-999999999975','99999999-9999-4999-8999-999999999972',3,'Different C'),
('99999999-9999-4999-8999-999999999984','99999999-9999-4999-8999-999999999982',1,'Cross A'),('99999999-9999-4999-8999-999999999985','99999999-9999-4999-8999-999999999982',2,'Cross B'),('99999999-9999-4999-8999-999999999986','99999999-9999-4999-8999-999999999983',1,'Cross C');
"@
  $moveRaceTemplate = @"
set statement_timeout = '3000ms'; set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
do `$block`$
begin
  begin perform public.move_travel_workspace_item(jsonb_build_object('type','move_item','tripId','99999999-9999-4999-8999-999999999961','itemId','99999999-9999-4999-8999-999999999964','expectedRevision',6,'targetDayId','99999999-9999-4999-8999-999999999963','targetPosition',2)); raise notice 'MOVE_RACE_SAME=%LABEL%_SUCCESS'; exception when sqlstate 'TW009' then raise notice 'MOVE_RACE_SAME=%LABEL%_TW009'; end;
  begin perform public.move_travel_workspace_item(jsonb_build_object('type','move_item','tripId','99999999-9999-4999-8999-999999999971','itemId','%DIFF_ITEM%','expectedRevision',5,'targetDayId','99999999-9999-4999-8999-999999999972','targetPosition',1)); raise notice 'MOVE_RACE_DIFFERENT=%LABEL%_SUCCESS'; exception when sqlstate 'TW009' then raise notice 'MOVE_RACE_DIFFERENT=%LABEL%_TW009'; end;
  begin perform public.move_travel_workspace_item(jsonb_build_object('type','move_item','tripId','99999999-9999-4999-8999-999999999981','itemId','%CROSS_ITEM%','expectedRevision',6,'targetDayId','99999999-9999-4999-8999-999999999983','targetPosition',2)); raise notice 'MOVE_RACE_CROSS=%LABEL%_SUCCESS'; exception when sqlstate 'TW009' then raise notice 'MOVE_RACE_CROSS=%LABEL%_TW009'; end;
end `$block`$;
"@
  $moveRaceA = Start-ConcurrentSql -Sql ($moveRaceTemplate.Replace('%LABEL%','A').Replace('%DIFF_ITEM%','99999999-9999-4999-8999-999999999974').Replace('%CROSS_ITEM%','99999999-9999-4999-8999-999999999984'))
  Start-Sleep -Milliseconds 100
  $moveRaceB = Start-ConcurrentSql -Sql ($moveRaceTemplate.Replace('%LABEL%','B').Replace('%DIFF_ITEM%','99999999-9999-4999-8999-999999999975').Replace('%CROSS_ITEM%','99999999-9999-4999-8999-999999999985'))
  $completedMoveJobs = Wait-Job -Job $moveRaceA, $moveRaceB -Timeout 15
  if ($completedMoveJobs.Count -ne 2) { Remove-Job -Job $moveRaceA, $moveRaceB -Force; throw 'Move concurrency test exceeded bounded timeout.' }
  $moveOutput = ((Receive-Job -Job $moveRaceA) + (Receive-Job -Job $moveRaceB)) -join "`n"
  Remove-Job -Job $moveRaceA, $moveRaceB
  foreach ($race in @('MOVE_RACE_SAME','MOVE_RACE_DIFFERENT','MOVE_RACE_CROSS')) {
    if (([regex]::Matches($moveOutput, "$race=.*_SUCCESS")).Count -ne 1 -or ([regex]::Matches($moveOutput, "$race=.*_TW009")).Count -ne 1) { throw "Move race result was invalid for $race.`n$moveOutput" }
  }
  Invoke-SqlText -Database $freshDb -Sql @"
do `$`$
begin
  if exists (select 1 from (select itinerary_day_id, position, row_number() over (partition by itinerary_day_id order by position) as expected from public.itinerary_items where itinerary_day_id in ('99999999-9999-4999-8999-999999999962','99999999-9999-4999-8999-999999999963','99999999-9999-4999-8999-999999999972','99999999-9999-4999-8999-999999999982','99999999-9999-4999-8999-999999999983')) as ordered where position <> expected) then raise exception 'Move race left non-contiguous positions.'; end if;
  if (select count(*) from public.itinerary_items where id='99999999-9999-4999-8999-999999999964') <> 1 or (select count(*) from public.itinerary_items where id in ('99999999-9999-4999-8999-999999999984','99999999-9999-4999-8999-999999999985')) <> 2 then raise exception 'Move race lost or duplicated stable items.'; end if;
end `$`$;
"@
  Write-Output 'workspace_move_concurrency_pass'

  # Canonical item->trip lock order: race the CAS RPC against the supported
  # note RPC (which updates item then its revision trigger updates trip). A
  # bounded wait proves there is no lock cycle; the stale CAS must conflict.
  Invoke-SqlText -Database $freshDb -Sql @"
insert into public.trips(id,user_id,title,destination,start_date,end_date)
values('99999999-9999-4999-8999-999999999921','11111111-1111-4111-8111-111111111111','Lock order','Hue','2027-11-01','2027-11-01');
insert into public.itinerary_days(id,trip_id,day_number,date)
values('99999999-9999-4999-8999-999999999922','99999999-9999-4999-8999-999999999921',1,'2027-11-01');
insert into public.itinerary_items(id,itinerary_day_id,position,place_name)
values('99999999-9999-4999-8999-999999999923','99999999-9999-4999-8999-999999999922',1,'Lock item');
"@
  $noteLockSql = @"
set statement_timeout = '3000ms';
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
begin;
select public.update_itinerary_item_note('99999999-9999-4999-8999-999999999923','Concurrent note');
select pg_sleep(1);
commit;
select 'LOCK_ORDER_NOTE_SUCCESS' as result;
"@
  $workspaceLockSql = @"
set statement_timeout = '3000ms';
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
do `$block`$
begin
  begin
    perform public.mutate_travel_workspace(jsonb_build_object(
      'type','update_item', 'tripId','99999999-9999-4999-8999-999999999921',
      'itemId','99999999-9999-4999-8999-999999999923', 'expectedRevision',3,
      'patch',jsonb_build_object('note','CAS note')));
    raise notice 'LOCK_ORDER_CAS_SUCCESS';
  exception when sqlstate 'TW009' then
    raise notice 'LOCK_ORDER_CAS_CONFLICT';
  end;
end
`$block`$;
"@
  $noteLockJob = Start-ConcurrentSql -Sql $noteLockSql
  Start-Sleep -Milliseconds 150
  $workspaceLockJob = Start-ConcurrentSql -Sql $workspaceLockSql
  $completedLockJobs = Wait-Job -Job $noteLockJob, $workspaceLockJob -Timeout 10
  if ($completedLockJobs.Count -ne 2) {
    Remove-Job -Job $noteLockJob, $workspaceLockJob -Force
    throw 'Workspace lock-order concurrency test exceeded bounded timeout.'
  }
  $lockOutput = ((Receive-Job -Job $noteLockJob) + (Receive-Job -Job $workspaceLockJob)) -join "`n"
  Remove-Job -Job $noteLockJob, $workspaceLockJob
  if ($lockOutput -notmatch 'LOCK_ORDER_NOTE_SUCCESS' -or $lockOutput -notmatch 'LOCK_ORDER_CAS_CONFLICT') {
    throw "Workspace lock-order concurrency result was invalid.`n$lockOutput"
  }
  Write-Output 'workspace_lock_order_concurrency_pass'

  # Source-link UPDATE/DELETE take a child-row lock before their AFTER trigger
  # obtains the trip revision lock. The replacement RPC must lock all current
  # child rows (stable UUID order) before item -> trip, then return TW009 if a
  # direct writer won. Both races have bounded waits to prove no lock cycle.
  Invoke-SqlText -Database $freshDb -Sql @"
insert into public.trips(id,user_id,title,destination,start_date,end_date) values
('99999999-9999-4999-8999-999999999931','11111111-1111-4111-8111-111111111111','Source update lock','Hue','2027-11-02','2027-11-02'),
('99999999-9999-4999-8999-999999999941','11111111-1111-4111-8111-111111111111','Source delete lock','Hue','2027-11-03','2027-11-03');
insert into public.itinerary_days(id,trip_id,day_number,date) values
('99999999-9999-4999-8999-999999999932','99999999-9999-4999-8999-999999999931',1,'2027-11-02'),
('99999999-9999-4999-8999-999999999942','99999999-9999-4999-8999-999999999941',1,'2027-11-03');
insert into public.itinerary_items(id,itinerary_day_id,position,place_name) values
('99999999-9999-4999-8999-999999999933','99999999-9999-4999-8999-999999999932',1,'Source update item'),
('99999999-9999-4999-8999-999999999943','99999999-9999-4999-8999-999999999942',1,'Source delete item');
insert into public.itinerary_item_source_links(id,itinerary_item_id,link_type,url,label,position) values
('99999999-9999-4999-8999-999999999934','99999999-9999-4999-8999-999999999933','website','https://example.test/update-one','One',1),
('99999999-9999-4999-8999-999999999935','99999999-9999-4999-8999-999999999933','website','https://example.test/update-two','Two',2),
('99999999-9999-4999-8999-999999999944','99999999-9999-4999-8999-999999999943','website','https://example.test/delete-one','One',1),
('99999999-9999-4999-8999-999999999945','99999999-9999-4999-8999-999999999943','website','https://example.test/delete-two','Two',2);
"@
  $directSourceUpdateSql = @"
set statement_timeout = '3000ms';
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
begin;
update public.itinerary_item_source_links set label='Direct update' where id='99999999-9999-4999-8999-999999999934';
select pg_sleep(1);
commit;
select 'SOURCE_LINK_DIRECT_UPDATE_SUCCESS' as result;
"@
  $replaceAfterUpdateSql = @"
set statement_timeout = '3000ms';
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
do `$block`$
begin
  begin
    perform public.mutate_travel_workspace(jsonb_build_object(
      'type','replace_source_links', 'tripId','99999999-9999-4999-8999-999999999931',
      'itemId','99999999-9999-4999-8999-999999999933', 'expectedRevision',5,
      'links',jsonb_build_array(jsonb_build_object('type','website','url','https://example.test/replaced','label','Replacement'))));
    raise notice 'SOURCE_LINK_REPLACE_UPDATE_SUCCESS';
  exception when sqlstate 'TW009' then
    raise notice 'SOURCE_LINK_REPLACE_UPDATE_CONFLICT';
  end;
end
`$block`$;
"@
  $sourceUpdateJob = Start-ConcurrentSql -Sql $directSourceUpdateSql
  Start-Sleep -Milliseconds 150
  $replaceUpdateJob = Start-ConcurrentSql -Sql $replaceAfterUpdateSql
  $completedSourceUpdateJobs = Wait-Job -Job $sourceUpdateJob, $replaceUpdateJob -Timeout 10
  if ($completedSourceUpdateJobs.Count -ne 2) {
    Remove-Job -Job $sourceUpdateJob, $replaceUpdateJob -Force
    throw 'Source-link UPDATE lock-order test exceeded bounded timeout.'
  }
  $sourceUpdateOutput = ((Receive-Job -Job $sourceUpdateJob) + (Receive-Job -Job $replaceUpdateJob)) -join "`n"
  Remove-Job -Job $sourceUpdateJob, $replaceUpdateJob
  if ($sourceUpdateOutput -notmatch 'SOURCE_LINK_DIRECT_UPDATE_SUCCESS' -or $sourceUpdateOutput -notmatch 'SOURCE_LINK_REPLACE_UPDATE_CONFLICT') {
    throw "Source-link UPDATE lock-order result was invalid.`n$sourceUpdateOutput"
  }
  Invoke-SqlText -Database $freshDb -Sql @"
do `$`$
begin
  if (select workspace_revision from public.trips where id='99999999-9999-4999-8999-999999999931') <> 6
     or (select count(*) from public.itinerary_item_source_links where itinerary_item_id='99999999-9999-4999-8999-999999999933') <> 2
     or not exists (select 1 from public.itinerary_item_source_links where id='99999999-9999-4999-8999-999999999934' and label='Direct update' and position=1) then
    raise exception 'Source-link UPDATE race did not preserve a valid monotonic state.';
  end if;
end
`$`$;
"@
  $directSourceDeleteSql = @"
set statement_timeout = '3000ms';
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
begin;
delete from public.itinerary_item_source_links where id='99999999-9999-4999-8999-999999999945';
select pg_sleep(1);
commit;
select 'SOURCE_LINK_DIRECT_DELETE_SUCCESS' as result;
"@
  $replaceAfterDeleteSql = @"
set statement_timeout = '3000ms';
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
do `$block`$
begin
  begin
    perform public.mutate_travel_workspace(jsonb_build_object(
      'type','replace_source_links', 'tripId','99999999-9999-4999-8999-999999999941',
      'itemId','99999999-9999-4999-8999-999999999943', 'expectedRevision',5,
      'links',jsonb_build_array(jsonb_build_object('type','website','url','https://example.test/replaced','label','Replacement'))));
    raise notice 'SOURCE_LINK_REPLACE_DELETE_SUCCESS';
  exception when sqlstate 'TW009' then
    raise notice 'SOURCE_LINK_REPLACE_DELETE_CONFLICT';
  end;
end
`$block`$;
"@
  $sourceDeleteJob = Start-ConcurrentSql -Sql $directSourceDeleteSql
  Start-Sleep -Milliseconds 150
  $replaceDeleteJob = Start-ConcurrentSql -Sql $replaceAfterDeleteSql
  $completedSourceDeleteJobs = Wait-Job -Job $sourceDeleteJob, $replaceDeleteJob -Timeout 10
  if ($completedSourceDeleteJobs.Count -ne 2) {
    Remove-Job -Job $sourceDeleteJob, $replaceDeleteJob -Force
    throw 'Source-link DELETE lock-order test exceeded bounded timeout.'
  }
  $sourceDeleteOutput = ((Receive-Job -Job $sourceDeleteJob) + (Receive-Job -Job $replaceDeleteJob)) -join "`n"
  Remove-Job -Job $sourceDeleteJob, $replaceDeleteJob
  if ($sourceDeleteOutput -notmatch 'SOURCE_LINK_DIRECT_DELETE_SUCCESS' -or $sourceDeleteOutput -notmatch 'SOURCE_LINK_REPLACE_DELETE_CONFLICT') {
    throw "Source-link DELETE lock-order result was invalid.`n$sourceDeleteOutput"
  }
  Invoke-SqlText -Database $freshDb -Sql @"
do `$`$
begin
  if (select workspace_revision from public.trips where id='99999999-9999-4999-8999-999999999941') <> 6
     or (select count(*) from public.itinerary_item_source_links where itinerary_item_id='99999999-9999-4999-8999-999999999943') <> 1
     or not exists (select 1 from public.itinerary_item_source_links where id='99999999-9999-4999-8999-999999999944' and position=1) then
    raise exception 'Source-link DELETE race did not preserve a valid monotonic state.';
  end if;
end
`$`$;
"@
  Write-Output 'workspace_source_link_lock_order_concurrency_pass'

  # Concurrent same-key/same-payload: both calls return one identical trip ID.
  $sameGraph = '{"title":"Concurrent same","destination":"Hue","startDate":"2027-06-01","endDate":"2027-06-01","days":[{"dayNumber":1,"date":"2027-06-01","items":[{"position":1,"placeName":"Citadel"}]}]}'
  $sameSql = @"
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
begin;
select public.create_trip_graph('concurrent-same-01', '$sameGraph'::jsonb) as trip_id;
select pg_sleep(1);
commit;
"@
  $sameA = Start-ConcurrentSql -Sql $sameSql
  Start-Sleep -Milliseconds 150
  $sameB = Start-ConcurrentSql -Sql $sameSql
  Wait-Job -Job $sameA, $sameB | Out-Null
  $sameOutputA = Receive-Job -Job $sameA
  $sameOutputB = Receive-Job -Job $sameB
  Remove-Job -Job $sameA, $sameB
  $sameIdsA = [regex]::Matches(($sameOutputA -join "`n"), '[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}') | ForEach-Object Value
  $sameIdsB = [regex]::Matches(($sameOutputB -join "`n"), '[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}') | ForEach-Object Value
  if ($sameIdsA.Count -lt 1 -or $sameIdsB.Count -lt 1 -or $sameIdsA[0] -ne $sameIdsB[0]) {
    throw 'Concurrent same-payload retries did not return the same trip ID.'
  }

  # Concurrent same-key/different-payload: one succeeds and one receives TW004.
  $conflictTemplate = @"
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
do `$block`$
begin
  begin
    perform public.create_trip_graph('concurrent-diff-01', '%GRAPH%'::jsonb);
    raise notice 'CONCURRENCY_RESULT=SUCCESS';
    perform pg_sleep(1);
  exception when sqlstate 'TW004' then
    raise notice 'CONCURRENCY_RESULT=CONFLICT';
  end;
end
`$block`$;
"@
  $graphA = '{"title":"Concurrent A","destination":"Hue","startDate":"2027-07-01","endDate":"2027-07-01","days":[{"dayNumber":1,"date":"2027-07-01","items":[{"position":1,"placeName":"A"}]}]}'
  $graphB = '{"title":"Concurrent B","destination":"Hue","startDate":"2027-07-01","endDate":"2027-07-01","days":[{"dayNumber":1,"date":"2027-07-01","items":[{"position":1,"placeName":"B"}]}]}'
  $diffA = Start-ConcurrentSql -Sql ($conflictTemplate.Replace('%GRAPH%', $graphA))
  Start-Sleep -Milliseconds 150
  $diffB = Start-ConcurrentSql -Sql ($conflictTemplate.Replace('%GRAPH%', $graphB))
  Wait-Job -Job $diffA, $diffB | Out-Null
  $diffOutput = ((Receive-Job -Job $diffA) + (Receive-Job -Job $diffB)) -join "`n"
  Remove-Job -Job $diffA, $diffB
  if (([regex]::Matches($diffOutput, 'CONCURRENCY_RESULT=SUCCESS')).Count -ne 1 -or
      ([regex]::Matches($diffOutput, 'CONCURRENCY_RESULT=CONFLICT')).Count -ne 1) {
    throw "Concurrent conflict behavior was not one success plus one TW004 conflict.`n$diffOutput"
  }

  # Different owners may use the same key concurrently and both persist independently.
  $ownerTemplate = @"
set role authenticated;
select set_config('request.jwt.claim.sub','%OWNER%',false);
select public.create_trip_graph('concurrent-owner-01', '{"title":"Owner %LABEL%","destination":"Hue","startDate":"2027-08-01","endDate":"2027-08-01","days":[{"dayNumber":1,"date":"2027-08-01","items":[{"position":1,"placeName":"%LABEL%"}]}]}'::jsonb);
"@
  $ownerA = Start-ConcurrentSql -Sql ($ownerTemplate.Replace('%OWNER%','11111111-1111-4111-8111-111111111111').Replace('%LABEL%','A'))
  $ownerB = Start-ConcurrentSql -Sql ($ownerTemplate.Replace('%OWNER%','22222222-2222-4222-8222-222222222222').Replace('%LABEL%','B'))
  Wait-Job -Job $ownerA, $ownerB | Out-Null
  $ownerOutput = ((Receive-Job -Job $ownerA) + (Receive-Job -Job $ownerB)) -join "`n"
  Remove-Job -Job $ownerA, $ownerB
  if (([regex]::Matches($ownerOutput, '[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}')).Count -lt 2) {
    throw 'Concurrent different-owner calls did not both return UUIDs.'
  }

  # Concurrent verified-place refreshes may race, but every committed row must
  # contain one complete snapshot. No field may be mixed across provider results.
  Invoke-SqlText -Database $freshDb -Sql @"
insert into public.trips(id,user_id,title,destination,start_date,end_date)
values('99999999-9999-4999-8999-999999999901','11111111-1111-4111-8111-111111111111','Snapshot race','Bangkok','2027-09-01','2027-09-01');
insert into public.itinerary_days(id,trip_id,day_number,date)
values('99999999-9999-4999-8999-999999999902','99999999-9999-4999-8999-999999999901',1,'2027-09-01');
insert into public.itinerary_items(id,itinerary_day_id,position,place_name)
values('99999999-9999-4999-8999-999999999903','99999999-9999-4999-8999-999999999902',1,'Unresolved race');
"@
  $snapshotTemplate = @"
set role service_role;
select public.apply_verified_place_snapshot(
  '11111111-1111-4111-8111-111111111111',
  '99999999-9999-4999-8999-999999999903',
  '%PLACE_ID%', '%NAME%', %LAT%, %LNG%, '%ADDRESS%', '%CATEGORY%'
);
"@
  $snapshotA = Start-ConcurrentSql -Sql ($snapshotTemplate.Replace('%PLACE_ID%','google-race-a').Replace('%NAME%','Race A').Replace('%LAT%','13.7001').Replace('%LNG%','100.4001').Replace('%ADDRESS%','Address A').Replace('%CATEGORY%','museum'))
  $snapshotB = Start-ConcurrentSql -Sql ($snapshotTemplate.Replace('%PLACE_ID%','google-race-b').Replace('%NAME%','Race B').Replace('%LAT%','13.7002').Replace('%LNG%','100.4002').Replace('%ADDRESS%','Address B').Replace('%CATEGORY%','park'))
  Wait-Job -Job $snapshotA, $snapshotB | Out-Null
  $snapshotOutput = ((Receive-Job -Job $snapshotA) + (Receive-Job -Job $snapshotB)) -join "`n"
  Remove-Job -Job $snapshotA, $snapshotB
  if (([regex]::Matches($snapshotOutput, '202[0-9]-[0-9]{2}-[0-9]{2}')).Count -lt 2) {
    throw "Concurrent snapshot writers did not both complete.`n$snapshotOutput"
  }

  Invoke-SqlText -Database $freshDb -Sql @"
do `$`$
begin
  if (select count(*) from public.trips where idempotency_key='concurrent-same-01') <> 1 then
    raise exception 'Concurrent same-payload trip count mismatch.';
  end if;
  if (select count(*) from public.trips where idempotency_key='concurrent-diff-01') <> 1 then
    raise exception 'Concurrent conflict trip count mismatch.';
  end if;
  if (select count(*) from public.trips where idempotency_key='concurrent-owner-01') <> 2
     or (select count(distinct user_id) from public.trips where idempotency_key='concurrent-owner-01') <> 2 then
    raise exception 'Concurrent different-owner isolation mismatch.';
  end if;
  if not exists (
    select 1 from public.itinerary_items
    where id='99999999-9999-4999-8999-999999999903'
      and place_resolved_at is not null
      and (
        (google_place_id='google-race-a' and place_name='Race A' and latitude=13.7001 and longitude=100.4001 and place_address='Address A' and place_category='museum')
        or
        (google_place_id='google-race-b' and place_name='Race B' and latitude=13.7002 and longitude=100.4002 and place_address='Address B' and place_category='park')
      )
  ) then
    raise exception 'Concurrent place resolution produced a partial or mixed snapshot.';
  end if;
end
`$`$;
select 'concurrency_pass' as result;
"@

  # The source-link cap must remain 12 under real concurrent transactions.
  Invoke-SqlText -Database $freshDb -Sql @"
insert into public.trips(id,user_id,title,destination,start_date,end_date)
values('99999999-9999-4999-8999-999999999911','11111111-1111-4111-8111-111111111111','Source link race','Hue','2027-10-01','2027-10-01');
insert into public.itinerary_days(id,trip_id,day_number,date)
values('99999999-9999-4999-8999-999999999912','99999999-9999-4999-8999-999999999911',1,'2027-10-01');
insert into public.itinerary_items(id,itinerary_day_id,position,place_name)
values('99999999-9999-4999-8999-999999999913','99999999-9999-4999-8999-999999999912',1,'Source link item');
insert into public.itinerary_item_source_links(itinerary_item_id,link_type,url,position)
select '99999999-9999-4999-8999-999999999913','website','https://example.test/race-' || value,value
from generate_series(1,11) as value;
"@

  $sourceLinkTemplate = @"
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
do `$block`$
begin
  begin
    insert into public.itinerary_item_source_links(itinerary_item_id,link_type,url,position)
    values('99999999-9999-4999-8999-999999999913','website','https://example.test/%LABEL%',%POSITION%);
    raise notice 'SOURCE_LINK_CONCURRENCY_RESULT=SUCCESS';
    perform pg_sleep(1);
  exception when sqlstate '22023' then
    raise notice 'SOURCE_LINK_CONCURRENCY_RESULT=LIMIT_REJECTED';
  end;
end
`$block`$;
"@
  $sourceLinkA = Start-ConcurrentSql -Sql ($sourceLinkTemplate.Replace('%LABEL%','race-a').Replace('%POSITION%','12'))
  Start-Sleep -Milliseconds 150
  $sourceLinkB = Start-ConcurrentSql -Sql ($sourceLinkTemplate.Replace('%LABEL%','race-b').Replace('%POSITION%','13'))
  Wait-Job -Job $sourceLinkA, $sourceLinkB | Out-Null
  $sourceLinkOutput = ((Receive-Job -Job $sourceLinkA) + (Receive-Job -Job $sourceLinkB)) -join "`n"
  Remove-Job -Job $sourceLinkA, $sourceLinkB
  if (([regex]::Matches($sourceLinkOutput, 'SOURCE_LINK_CONCURRENCY_RESULT=SUCCESS')).Count -ne 1 -or
      ([regex]::Matches($sourceLinkOutput, 'SOURCE_LINK_CONCURRENCY_RESULT=LIMIT_REJECTED')).Count -ne 1) {
    throw "Concurrent source-link cap did not produce one success and one limit rejection.`n$sourceLinkOutput"
  }

  Invoke-SqlText -Database $freshDb -Sql @"
do `$`$
begin
  if (select count(*) from public.itinerary_item_source_links where itinerary_item_id='99999999-9999-4999-8999-999999999913') <> 12 then
    raise exception 'Concurrent source-link cap exceeded twelve rows.';
  end if;
end
`$`$;
select 'source_link_concurrency_pass' as result;
"@


  . (Join-Path $PSScriptRoot 'workspace_direct_writer_concurrency.ps1')

  Invoke-SqlText -Database $freshDb -Sql "create database $upgradeDb;"
  Invoke-SqlFile -Database $upgradeDb -Path (Join-Path $PSScriptRoot 'bootstrap.sql')
  Invoke-SqlFile -Database $upgradeDb -Path (Join-Path $migrationRoot '20260819000000_supabase_personal_app_foundation.sql')
  Invoke-SqlFile -Database $upgradeDb -Path (Join-Path $migrationRoot '20260819010000_auth_profile_foundation.sql')
  Invoke-SqlFile -Database $upgradeDb -Path (Join-Path $PSScriptRoot 'upgrade_seed.sql')
  foreach ($migration in $migrations | Where-Object Name -GT '20260819010000_auth_profile_foundation.sql') {
    Invoke-SqlFile -Database $upgradeDb -Path $migration.FullName
  }
  Invoke-SqlFile -Database $upgradeDb -Path (Join-Path $PSScriptRoot 'upgrade_verify.sql')

  Write-Output 'PERSISTENCE_TESTS_PASS'
}
finally {
  $existing = docker ps -a --filter "name=^/$container$" --format '{{.Names}}'
  if ($existing -eq $container) {
    Invoke-Docker -Arguments @('rm', '-f', $container)
  }
}
