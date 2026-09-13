# Existing owner command: duplicate requests race, one succeeds and one stays TW009.
$progressRaceSql = @'
set statement_timeout='5000ms'; set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
do $$ begin
  begin
    perform public.mutate_travel_workspace('{"type":"transition_item_status","tripId":"76000000-0000-4000-8000-000000000001","itemId":"76000000-0000-4000-8000-000000000021","expectedRevision":8,"status":"completed"}');
    raise notice 'PROGRESS_RACE_SUCCESS';
  exception when sqlstate 'TW009' then raise notice 'PROGRESS_RACE_STALE'; end;
end $$;
'@
$progressA = Start-ConcurrentSql -Sql $progressRaceSql
$progressB = Start-ConcurrentSql -Sql $progressRaceSql
$progressDone = Wait-Job -Job $progressA,$progressB -Timeout 15
if ($progressDone.Count -ne 2) { throw 'Progress concurrency timed out.' }
$progressOutput = ((Receive-Job $progressA) + (Receive-Job $progressB)) -join "`n"
Remove-Job $progressA,$progressB
if (([regex]::Matches($progressOutput,'PROGRESS_RACE_SUCCESS')).Count -ne 1 -or
    ([regex]::Matches($progressOutput,'PROGRESS_RACE_STALE')).Count -ne 1) { throw "Progress race invalid: $progressOutput" }
Invoke-SqlText -Database $freshDb -Sql @'
do $$ begin
  if (select count(*) from public.trip_progress_events where trip_id='76000000-0000-4000-8000-000000000001')<>5 then
    raise exception 'Duplicate race event';
  end if;
end $$;
'@
Write-Output 'trip_progress_concurrency_one_event_pass'
