[CmdletBinding()]
param([string]$Container = 'supabase_db_TripWise')
$ErrorActionPreference = 'Stop'
$database = 'tripwise_t003_' + (Get-Date -Format 'yyyyMMddHHmmss')
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path
# Creates an isolated database only. Never drops or overwrites an existing database/container.
& docker exec $Container createdb -U postgres $database
if ($LASTEXITCODE -ne 0) { throw 'Isolated database creation failed.' }
Write-Output "ISOLATED_DATABASE=$database"
$files = @((Join-Path $PSScriptRoot 'bootstrap.sql')) + @(
  Get-ChildItem -LiteralPath (Join-Path $repoRoot 'supabase/migrations') -Filter '*.sql' | Sort-Object Name | ForEach-Object FullName
) + @((Join-Path $PSScriptRoot 'notification_preferences_contract.sql'))
foreach ($path in $files) {
  if ([System.IO.Path]::GetFileName($path) -eq '20260914000000_notification_preferences_t003.sql') {
    # Simulate permissive Supabase defaults in this new database, then prove migration revokes them.
    'alter default privileges in schema public grant all on tables to anon, authenticated;' |
      & docker exec -i $Container psql -X -v ON_ERROR_STOP=1 -U postgres -d $database
    if ($LASTEXITCODE -ne 0) { throw 'Isolated default ACL fixture failed.' }
  }
  Write-Output "SQL_FILE=$([System.IO.Path]::GetFileName($path))"
  Get-Content -LiteralPath $path -Raw -Encoding UTF8 | & docker exec -i $Container psql -X -v ON_ERROR_STOP=1 -U postgres -d $database
  if ($LASTEXITCODE -ne 0) { throw "SQL verification failed: $([System.IO.Path]::GetFileName($path))" }
}
Write-Output 'T003_ISOLATED_MIGRATION_CHAIN_AND_RLS_PASS'
Write-Output "Database retained for inspection: $database"
