# Called by run.ps1 against its isolated fresh database. Two independent
# authenticated sessions use the same confirmation identity concurrently.
$refreshTrip = [guid]::NewGuid().ToString()
$refreshDay = [guid]::NewGuid().ToString()
$refreshA = [guid]::NewGuid().ToString()
$refreshB = [guid]::NewGuid().ToString()

Invoke-SqlText -Database $freshDb -Sql @"
insert into public.trips(id,user_id,title,destination,start_date,end_date)
values('$refreshTrip','11111111-1111-4111-8111-111111111111','Refresh concurrency','Hue','2028-09-01','2028-09-01');
insert into public.itinerary_days(id,trip_id,day_number,date)
values('$refreshDay','$refreshTrip',1,'2028-09-01');
insert into public.itinerary_items(id,itinerary_day_id,position,place_name,item_kind,flexibility,priority,activity_status)
values('$refreshA','$refreshDay',1,'A','place','flexible','must_do','scheduled'),
      ('$refreshB','$refreshDay',2,'B','place','flexible','must_do','scheduled');
"@
$refreshRevision = (& docker exec $container psql -X -At -U postgres -d $freshDb -c "select workspace_revision from public.trips where id='$refreshTrip'").Trim()
if ($LASTEXITCODE -ne 0 -or $refreshRevision -notmatch '^[1-9][0-9]*$') { throw 'Refresh concurrency baseline revision was unavailable.' }
$refreshCommand = "{`"tripId`":`"$refreshTrip`",`"expectedRevision`":$refreshRevision,`"proposalId`":`"refresh-v1-concurrent-01`",`"confirmationId`":`"confirm-v1-concurrent-01`",`"idempotencyKey`":`"confirm-v1-concurrent-01`",`"items`":[{`"itemId`":`"$refreshA`",`"dayId`":`"$refreshDay`",`"position`":2},{`"itemId`":`"$refreshB`",`"dayId`":`"$refreshDay`",`"position`":1}]}"
$refreshSql = @"
set statement_timeout = '5000ms';
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
select public.apply_trip_refresh('$refreshCommand'::jsonb) as result;
"@
$refreshJobA = Start-ConcurrentSql -Sql $refreshSql
$refreshJobB = Start-ConcurrentSql -Sql $refreshSql
try {
  $completed = Wait-Job -Job $refreshJobA, $refreshJobB -Timeout 10
  if ($completed.Count -ne 2) { throw 'Refresh idempotency concurrency test exceeded bounded timeout.' }
  $output = ((Receive-Job -Job $refreshJobA) + (Receive-Job -Job $refreshJobB)) -join "`n"
  if (([regex]::Matches($output, '"noOp"\s*:\s*false')).Count -ne 2) {
    throw "Concurrent refresh calls did not return the one stored effective result.`n$output"
  }
  Invoke-SqlText -Database $freshDb -Sql @"
do `$`$
begin
  if (select count(*) from public.trip_refresh_apply_idempotency where confirmation_id='confirm-v1-concurrent-01') <> 1 then
    raise exception 'Concurrent refresh created multiple idempotency rows.';
  end if;
  if (select array_agg(id order by position) from public.itinerary_items where itinerary_day_id='$refreshDay')
     is distinct from array['$refreshB'::uuid,'$refreshA'::uuid] then
    raise exception 'Concurrent refresh did not leave exactly one reviewed order.';
  end if;
  if (select workspace_revision from public.trips where id='$refreshTrip') <= $refreshRevision then
    raise exception 'Concurrent refresh did not advance revision.';
  end if;
end
`$`$;
"@
  Write-Output 'trip_refresh_apply_concurrency_pass'
}
finally {
  Remove-Job -Job $refreshJobA, $refreshJobB -Force
}

# Race with existing direct/workspace writer: canonical lock order (items -> days -> trip)
# ensures a writer holding an item and updating trip revision does NOT deadlock with apply_trip_refresh.
$raceTrip = [guid]::NewGuid().ToString()
$raceDay = [guid]::NewGuid().ToString()
$raceItemA = [guid]::NewGuid().ToString()
$raceItemB = [guid]::NewGuid().ToString()

Invoke-SqlText -Database $freshDb -Sql @"
insert into public.trips(id,user_id,title,destination,start_date,end_date)
values('$raceTrip','11111111-1111-4111-8111-111111111111','Refresh writer lock race','Hue','2028-09-02','2028-09-02');
insert into public.itinerary_days(id,trip_id,day_number,date)
values('$raceDay','$raceTrip',1,'2028-09-02');
insert into public.itinerary_items(id,itinerary_day_id,position,place_name,item_kind,flexibility,priority,activity_status)
values('$raceItemA','$raceDay',1,'A','place','flexible','must_do','scheduled'),
      ('$raceItemB','$raceDay',2,'B','place','flexible','must_do','scheduled');
"@

$raceRevision = (& docker exec $container psql -X -At -U postgres -d $freshDb -c "select workspace_revision from public.trips where id='$raceTrip'").Trim()
if ($LASTEXITCODE -ne 0 -or $raceRevision -notmatch '^[1-9][0-9]*$') { throw 'Refresh writer race baseline revision was unavailable.' }

$writerSql = @"
set statement_timeout = '5000ms';
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
begin;
select public.update_itinerary_item_note('$raceItemA', 'Concurrent writer note');
select pg_sleep(1);
commit;
select 'DIRECT_WRITER_NOTE_SUCCESS' as result;
"@

$raceRefreshCommand = "{`"tripId`":`"$raceTrip`",`"expectedRevision`":$raceRevision,`"proposalId`":`"refresh-v1-race-01`",`"confirmationId`":`"confirm-v1-race-01`",`"idempotencyKey`":`"confirm-v1-race-01`",`"items`":[{`"itemId`":`"$raceItemA`",`"dayId`":`"$raceDay`",`"position`":2},{`"itemId`":`"$raceItemB`",`"dayId`":`"$raceDay`",`"position`":1}]}"
$raceRefreshSql = @"
set statement_timeout = '5000ms';
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
do `$block`$
begin
  begin
    perform public.apply_trip_refresh('$raceRefreshCommand'::jsonb);
    raise notice 'REFRESH_WRITER_RACE=UNEXPECTED_SUCCESS';
  exception when sqlstate 'TW018' then
    raise notice 'REFRESH_WRITER_RACE=TW018_STALE_BASELINE';
  end;
end
`$block`$;
"@

$writerJob = Start-ConcurrentSql -Sql $writerSql
Start-Sleep -Milliseconds 150
$raceRefreshJob = Start-ConcurrentSql -Sql $raceRefreshSql

try {
  $completedRace = Wait-Job -Job $writerJob, $raceRefreshJob -Timeout 10
  if ($completedRace.Count -ne 2) { throw 'Refresh writer lock-order race exceeded bounded timeout.' }
  $raceOutput = ((Receive-Job -Job $writerJob) + (Receive-Job -Job $raceRefreshJob)) -join "`n"
  if ($raceOutput -notmatch 'DIRECT_WRITER_NOTE_SUCCESS' -or $raceOutput -notmatch 'REFRESH_WRITER_RACE=TW018_STALE_BASELINE') {
    throw "Refresh writer race result was invalid.`n$raceOutput"
  }
  Invoke-SqlText -Database $freshDb -Sql @"
do `$`$
begin
  if (select count(*) from public.trip_refresh_apply_idempotency where confirmation_id='confirm-v1-race-01') <> 0 then
    raise exception 'Aborted stale refresh left an idempotency row.';
  end if;
  if (select note from public.itinerary_items where id='$raceItemA') is distinct from 'Concurrent writer note' then
    raise exception 'Direct writer note was not committed.';
  end if;
  if (select workspace_revision from public.trips where id='$raceTrip') <= $raceRevision then
    raise exception 'Workspace revision did not advance from writer.';
  end if;
end
`$`$;
"@
  Write-Output 'trip_refresh_apply_writer_lock_order_pass'
}
finally {
  Remove-Job -Job $writerJob, $raceRefreshJob -Force
}
