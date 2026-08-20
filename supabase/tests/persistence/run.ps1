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
    if ($LASTEXITCODE -eq 0) {
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
end
`$`$;
select 'concurrency_pass' as result;
"@

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
