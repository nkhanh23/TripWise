# Called by run.ps1 against its isolated fresh database. Never run on remote.
# Observe pg_sleep AFTER the writer has acquired its row, then observe the RPC
# blocked by that writer. Timing alone must not manufacture a concurrency PASS.
foreach ($raceKind in @('move_day', 'move_sibling', 'create_day')) {
  $raceTrip = [guid]::NewGuid().ToString()
  $raceDay = [guid]::NewGuid().ToString()
  $raceItem = [guid]::NewGuid().ToString()
  $raceSibling = [guid]::NewGuid().ToString()
  Invoke-SqlText -Database $freshDb -Sql @"
insert into public.trips(id,user_id,title,destination,start_date,end_date)
values('$raceTrip','11111111-1111-4111-8111-111111111111','Direct writer race','Hue','2028-01-01','2028-01-01');
insert into public.itinerary_days(id,trip_id,day_number,date) values('$raceDay','$raceTrip',1,'2028-01-01');
insert into public.itinerary_items(id,itinerary_day_id,position,place_name)
values('$raceItem','$raceDay',1,'A'),('$raceSibling','$raceDay',2,'B');
"@
  $rowLock = "select id from public.itinerary_days where id='$raceDay' for update;"
  $directWrite = "update public.itinerary_days set summary='Direct writer committed' where id='$raceDay';"
  if ($raceKind -eq 'move_sibling') {
    $rowLock = "select id from public.itinerary_items where id='$raceSibling' for update;"
    $directWrite = "update public.itinerary_items set note='Direct writer committed' where id='$raceSibling';"
  }
  $rpcCall = "public.move_travel_workspace_item(jsonb_build_object('type','move_item','tripId','$raceTrip','itemId','$raceItem','expectedRevision',4,'targetDayId','$raceDay','targetPosition',2))"
  if ($raceKind -eq 'create_day') {
    $rpcCall = "public.create_travel_workspace_item(jsonb_build_object('type','create_item','tripId','$raceTrip','dayId','$raceDay','expectedRevision',4,'item',jsonb_build_object('itemKind','custom_activity','title','New','flexibility','fixed','priority','must_do')))"
  }
  $writerSql = @"
set statement_timeout='20s'; set application_name='t002_${raceKind}_writer';
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
begin;
$rowLock
do `$`$ declare overlap boolean := false; begin
  for attempt in 1..150 loop
    select exists(select 1 from pg_stat_activity where application_name='t002_${raceKind}_rpc' and pg_backend_pid()=any(pg_blocking_pids(pid))) into overlap;
    if overlap then exit; end if;
    perform pg_sleep(0.1);
    perform pg_stat_clear_snapshot();
  end loop;
  if not overlap then raise exception 'RPC blocking overlap was not observed'; end if;
  raise notice 'DIRECT_WRITER_OVERLAP_PROVEN';
end `$`$;
$directWrite
commit;
select 'DIRECT_WRITER_COMMITTED';
"@
  $rpcSql = @"
set statement_timeout='20s'; set application_name='t002_${raceKind}_rpc';
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
do `$`$ begin
  begin perform $rpcCall;
    raise exception 'Expected stale RPC conflict';
  exception when sqlstate 'TW009' then raise notice 'DIRECT_WRITER_RPC_CONFLICT'; end;
end `$`$;
"@
  $writerJob = Start-ConcurrentSql -Sql $writerSql
  $rpcJob = $null
  try {
    $writerObserved = $false
    for ($poll = 0; $poll -lt 40; $poll++) {
      $probe = & docker exec $container psql -X -At -U postgres -d $freshDb -c "select count(*) from pg_stat_activity where application_name='t002_${raceKind}_writer' and wait_event='PgSleep'"
      if ($LASTEXITCODE -ne 0) { throw 'Writer observation failed.' }
      if ($probe -eq '1') { $writerObserved = $true; break }
      Start-Sleep -Milliseconds 50
    }
    if (-not $writerObserved) { throw "Writer row lock was not observed: $raceKind" }
    $rpcJob = Start-ConcurrentSql -Sql $rpcSql
    $done = @(Wait-Job -Job $writerJob, $rpcJob -Timeout 25)
    if ($done.Count -ne 2) { throw "Direct writer race exceeded bounded wait: $raceKind" }
    $raceOutput = ((Receive-Job $writerJob) + (Receive-Job $rpcJob)) -join "`n"
    if ($raceOutput -notmatch 'DIRECT_WRITER_OVERLAP_PROVEN' -or $raceOutput -notmatch 'DIRECT_WRITER_COMMITTED' -or $raceOutput -notmatch 'DIRECT_WRITER_RPC_CONFLICT') {
      throw "Direct writer race assertion failed: $raceKind`n$raceOutput"
    }
    Invoke-SqlText -Database $freshDb -Sql @"
do `$`$ begin
  if (select workspace_revision from public.trips where id='$raceTrip') <> 5
     or (select array_agg(id order by position) from public.itinerary_items where itinerary_day_id='$raceDay') is distinct from array['$raceItem'::uuid,'$raceSibling'::uuid]
     or (select array_agg(position order by position) from public.itinerary_items where itinerary_day_id='$raceDay') is distinct from array[1,2]
     or not exists (select 1 from public.itinerary_days where id='$raceDay' and day_number=1)
  then raise exception 'Direct writer final graph/revision/identity assertion failed'; end if;
  if '$raceKind'='move_sibling' then
    if (select note from public.itinerary_items where id='$raceSibling') is distinct from 'Direct writer committed' then raise exception 'Sibling write lost'; end if;
  else
    if (select summary from public.itinerary_days where id='$raceDay') is distinct from 'Direct writer committed' then raise exception 'Day write lost'; end if;
  end if;
end `$`$;
"@
    Write-Output "workspace_direct_writer_${raceKind}_pass"
  }
  finally {
    if ($null -ne $rpcJob) { Remove-Job -Job $rpcJob -Force }
    Remove-Job -Job $writerJob -Force
  }
}
Write-Output 'workspace_move_direct_writer_concurrency_pass'
