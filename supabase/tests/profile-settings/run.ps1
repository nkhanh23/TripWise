[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$dockerConfig = Join-Path ([System.IO.Path]::GetTempPath()) 'tripwise-docker-config'
New-Item -ItemType Directory -Path $dockerConfig -Force | Out-Null
$env:DOCKER_CONFIG = $dockerConfig

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
$migrationRoot = Join-Path $repoRoot 'supabase\migrations'
$bootstrap = Join-Path $repoRoot 'supabase\tests\persistence\bootstrap.sql'
$freshContainer = 'tripwise-profile-settings-fresh-tests'
$upgradeContainer = 'tripwise-profile-settings-upgrade-tests'
$container = $freshContainer
$image = 'postgis/postgis:16-3.4-alpine'
$freshDb = 'profile_settings_fresh'
$upgradeDb = 'profile_settings_upgrade'

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
    docker exec -i $container psql -X -q -v ON_ERROR_STOP=1 -U postgres -d $Database
  if ($LASTEXITCODE -ne 0) {
    throw "SQL file failed: $Path"
  }
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

  $migrations = Get-ChildItem -LiteralPath $migrationRoot -Filter '*.sql' | Sort-Object Name

  Invoke-SqlFile -Database $freshDb -Path $bootstrap
  foreach ($migration in $migrations) {
    Invoke-SqlFile -Database $freshDb -Path $migration.FullName
  }
  Invoke-SqlFile -Database $freshDb -Path (Join-Path $PSScriptRoot 'contract.sql')

  Invoke-Docker -Arguments @('rm', '-f', $container)
  $container = $upgradeContainer

  $existing = docker ps -a --filter "name=^/$container$" --format '{{.Names}}'
  if ($existing -eq $container) {
    Invoke-Docker -Arguments @('rm', '-f', $container)
  }
  Invoke-Docker -Arguments @(
    'run', '--detach', '--name', $container,
    '--env', 'POSTGRES_PASSWORD=tripwise_test_only',
    '--env', "POSTGRES_DB=$upgradeDb",
    $image
  )
  $ready = $false
  for ($attempt = 1; $attempt -le 45; $attempt++) {
    & docker exec $container pg_isready -U postgres -d $upgradeDb *> $null
    if ($LASTEXITCODE -eq 0) {
      $ready = $true
      break
    }
    Start-Sleep -Seconds 1
  }
  if (-not $ready) {
    throw 'Upgrade PostgreSQL test container did not become ready.'
  }

  Invoke-SqlFile -Database $upgradeDb -Path $bootstrap
  foreach ($migration in $migrations | Where-Object Name -LE '20260822010000_add_saved_places_update_policy.sql') {
    Invoke-SqlFile -Database $upgradeDb -Path $migration.FullName
  }
  Invoke-SqlFile -Database $upgradeDb -Path (Join-Path $PSScriptRoot 'upgrade_seed.sql')
  foreach ($migration in $migrations | Where-Object Name -GT '20260822010000_add_saved_places_update_policy.sql') {
    Invoke-SqlFile -Database $upgradeDb -Path $migration.FullName
  }
  Invoke-SqlFile -Database $upgradeDb -Path (Join-Path $PSScriptRoot 'upgrade_verify.sql')

  Write-Output 'PROFILE_SETTINGS_TESTS_PASS'
}
finally {
  foreach ($candidate in @($freshContainer, $upgradeContainer)) {
    $existing = docker ps -a --filter "name=^/$candidate$" --format '{{.Names}}'
    if ($existing -eq $candidate) {
      Invoke-Docker -Arguments @('rm', '-f', $candidate)
    }
  }
}
