[CmdletBinding()]
param([Parameter(Mandatory)][string]$EvidenceDirectory)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Add-Type -AssemblyName System.Net.Http

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
$projectRef = (Get-Content -LiteralPath (Join-Path $repoRoot 'supabase\.temp\project-ref') -Raw).Trim()
if ($projectRef -ne 'bvblyrzbkyhcreimuumu') { throw 'Linked target differs from authorized TripWise project.' }
$evidencePath = [System.IO.Path]::GetFullPath((Join-Path $repoRoot $EvidenceDirectory))
$expectedEvidenceRoot = [System.IO.Path]::GetFullPath((Join-Path $repoRoot '.runtime-evidence'))
if (-not $evidencePath.StartsWith($expectedEvidenceRoot, [StringComparison]::OrdinalIgnoreCase)) { throw 'Unexpected evidence directory.' }
New-Item -ItemType Directory -Path $evidencePath -Force | Out-Null

$baseUrl = "https://$projectRef.supabase.co"
$runId = ([guid]::NewGuid().ToString('N')).Substring(0, 12)
$emailA = "codex-p5-t004-a-$runId@example.invalid"
$emailB = "codex-p5-t004-b-$runId@example.invalid"
$passwordA = "Tw!$([guid]::NewGuid().ToString('N'))"
$passwordB = "Tw!$([guid]::NewGuid().ToString('N'))"
$createdUserIds = [System.Collections.Generic.List[string]]::new()
$http = [System.Net.Http.HttpClient]::new()
$http.Timeout = [TimeSpan]::FromSeconds(30)
$anonKey = $null
$serviceKey = $null
$cleanupFailures = 0
$ownerCleanupFailures = 0
$ownerDeletedTrips = 0
$signA = $null
$buildPath = Join-Path ([System.IO.Path]::GetTempPath()) "tripwise-t004-runtime-$runId"

function New-Headers([string]$ApiKey,[string]$Token) {
  $headers=@{apikey=$ApiKey}; if($Token){$headers.Authorization="Bearer $Token"}; $headers
}
function Invoke-Api([string]$Method,[string]$Path,[hashtable]$Headers,$Body=$null) {
  $request=[System.Net.Http.HttpRequestMessage]::new([System.Net.Http.HttpMethod]::new($Method),"$baseUrl$Path")
  foreach($entry in $Headers.GetEnumerator()){[void]$request.Headers.TryAddWithoutValidation($entry.Key,[string]$entry.Value)}
  if($null-ne$Body){$json=$Body|ConvertTo-Json -Depth 20 -Compress;$request.Content=[System.Net.Http.StringContent]::new($json,[Text.Encoding]::UTF8,'application/json')}
  try{$response=$http.SendAsync($request).GetAwaiter().GetResult();try{$raw=$response.Content.ReadAsStringAsync().GetAwaiter().GetResult();$parsed=if($raw){$raw|ConvertFrom-Json}else{$null};[pscustomobject]@{Status=[int]$response.StatusCode;Body=$parsed}}finally{$response.Dispose()}}finally{$request.Dispose()}
}
function Assert-Success($Response,[string]$Context){if($Response.Status-lt 200-or$Response.Status-ge 300){throw "$Context failed with HTTP $($Response.Status)."}}

try {
  $keys = (npx.cmd --yes supabase projects api-keys --project-ref $projectRef --output json | ConvertFrom-Json)
  $anonKey = [string](($keys|Where-Object name -eq 'anon'|Select-Object -First 1).api_key)
  $serviceKey = [string](($keys|Where-Object name -eq 'service_role'|Select-Object -First 1).api_key)
  if(-not$anonKey-or-not$serviceKey){throw 'Required linked API key metadata unavailable.'}
  $adminHeaders=New-Headers $serviceKey $serviceKey
  foreach($identity in @(@{email=$emailA;password=$passwordA;label='A'},@{email=$emailB;password=$passwordB;label='B'})){
    $created=Invoke-Api 'POST' '/auth/v1/admin/users' $adminHeaders @{email=$identity.email;password=$identity.password;email_confirm=$true;user_metadata=@{purpose='FEATURE-P5-T004 functional remote evidence';run_id=$runId;label=$identity.label}}
    Assert-Success $created "create test user $($identity.label)";[void]$createdUserIds.Add([string]$created.Body.id)
  }
  $signA=Invoke-Api 'POST' '/auth/v1/token?grant_type=password' (New-Headers $anonKey '') @{email=$emailA;password=$passwordA}
  $signB=Invoke-Api 'POST' '/auth/v1/token?grant_type=password' (New-Headers $anonKey '') @{email=$emailB;password=$passwordB}
  Assert-Success $signA 'sign in user A';Assert-Success $signB 'sign in user B'

  $env:TRIPWISE_T004_REMOTE_RUN='1'
  $env:TRIPWISE_T004_SUPABASE_URL=$baseUrl
  $env:TRIPWISE_T004_ANON_KEY=$anonKey
  $env:TRIPWISE_T004_USER_A_TOKEN=[string]$signA.Body.access_token
  $env:TRIPWISE_T004_USER_B_TOKEN=[string]$signB.Body.access_token
  $env:TRIPWISE_T004_USER_A_ID=[string]$signA.Body.user.id
  $env:TRIPWISE_T004_USER_B_ID=[string]$signB.Body.user.id
  $env:TRIPWISE_T004_RUN_ID=$runId
  $mobileRoot=Join-Path $repoRoot 'mobile'
  Push-Location $mobileRoot
  $previousPreference=$ErrorActionPreference
  $ErrorActionPreference='Continue'
  try {
    & npx.cmd tsc tests/trip-refresh.remote.runtime.test.ts --ignoreConfig --outDir $buildPath --module node16 --target es2022 --moduleResolution node16 --esModuleInterop --skipLibCheck --types node,jest
    if($LASTEXITCODE-ne 0){throw 'Remote harness compilation failed.'}
    $compiledTest=Join-Path $buildPath 'tests\trip-refresh.remote.runtime.test.js'
    $env:NODE_PATH=Join-Path $mobileRoot 'node_modules'
    & node.exe (Join-Path $repoRoot 'supabase\tests\persistence\remote-trip-refresh-node-runner.cjs') $compiledTest 2>&1 | Tee-Object -FilePath (Join-Path $evidencePath 'functional-runtime.raw.txt'); $testExit=$LASTEXITCODE
  }
  finally { $ErrorActionPreference=$previousPreference; Pop-Location }
  Set-Content -LiteralPath (Join-Path $evidencePath 'functional-runtime.exit.txt') -Value $testExit
  if($testExit-ne 0){throw "Functional remote Jest failed with exit $testExit."}
}
finally {
  if($anonKey-and$signA-and$createdUserIds.Count-gt 0){
    try {
      $ownerHeaders=New-Headers $anonKey ([string]$signA.Body.access_token)
      $owned=Invoke-Api 'GET' "/rest/v1/trips?select=id,title&user_id=eq.$($createdUserIds[0])" $ownerHeaders
      Assert-Success $owned 'list disposable owner trips during cleanup'
      $expectedTitle="T004 disposable $runId"
      foreach($trip in @($owned.Body|Where-Object title -eq $expectedTitle)){
        $deletedTrip=Invoke-Api 'POST' '/rest/v1/rpc/delete_saved_trip' $ownerHeaders @{p_trip_id=$trip.id}
        if($deletedTrip.Status-ge 200-and$deletedTrip.Status-lt 300-and$deletedTrip.Body-eq$true){$ownerDeletedTrips++}else{$ownerCleanupFailures++}
      }
    } catch { $ownerCleanupFailures++ }
  }
  Remove-Item Env:TRIPWISE_T004_REMOTE_RUN,Env:TRIPWISE_T004_SUPABASE_URL,Env:TRIPWISE_T004_ANON_KEY,Env:TRIPWISE_T004_USER_A_TOKEN,Env:TRIPWISE_T004_USER_B_TOKEN,Env:TRIPWISE_T004_USER_A_ID,Env:TRIPWISE_T004_USER_B_ID,Env:TRIPWISE_T004_RUN_ID -ErrorAction SilentlyContinue
  Remove-Item Env:NODE_PATH -ErrorAction SilentlyContinue
  $resolvedTemp=[System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
  $resolvedBuild=[System.IO.Path]::GetFullPath($buildPath)
  if((Test-Path -LiteralPath $resolvedBuild)-and$resolvedBuild.StartsWith($resolvedTemp,[StringComparison]::OrdinalIgnoreCase)-and([System.IO.Path]::GetFileName($resolvedBuild)-eq"tripwise-t004-runtime-$runId")){
    Remove-Item -LiteralPath $resolvedBuild -Recurse -Force
  }
  if($serviceKey-and$createdUserIds.Count-gt 0){
    $adminHeaders=New-Headers $serviceKey $serviceKey
    foreach($userId in $createdUserIds){try{$deleted=Invoke-Api 'DELETE' "/auth/v1/admin/users/$userId" $adminHeaders;if($deleted.Status-lt 200-or$deleted.Status-ge 300){$cleanupFailures++}}catch{$cleanupFailures++}}
    $remaining=Invoke-Api 'GET' "/rest/v1/trips?select=id&user_id=in.($([string]::Join(',',$createdUserIds)))" $adminHeaders
    $cleanupPass=$ownerCleanupFailures-eq 0-and$cleanupFailures-eq 0-and$remaining.Status-ge 200-and$remaining.Status-lt 300-and@($remaining.Body).Count-eq 0
    [ordered]@{createdUsers=$createdUserIds.Count;ownerDeletedTrips=$ownerDeletedTrips;ownerCleanupFailures=$ownerCleanupFailures;deletedUsers=($createdUserIds.Count-$cleanupFailures);remainingTrips=@($remaining.Body).Count;cleanupPass=$cleanupPass}|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $evidencePath 'cleanup.json')
    if($cleanupPass){Write-Output 'REMOTE_T004_CLEANUP_PASS'}else{Write-Warning 'REMOTE_T004_CLEANUP_FAILED'}
  }
  $http.Dispose();$passwordA=$null;$passwordB=$null;$anonKey=$null;$serviceKey=$null
}
