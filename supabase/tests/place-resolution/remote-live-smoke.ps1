[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Add-Type -AssemblyName System.Net.Http

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
$projectRefPath = Join-Path $repoRoot 'supabase\.temp\project-ref'
if (-not (Test-Path -LiteralPath $projectRefPath)) {
  throw 'Supabase project is not linked.'
}

$projectRef = (Get-Content -LiteralPath $projectRefPath -Raw).Trim()
if ($projectRef -notmatch '^[a-z]{20}$') {
  throw 'Linked Supabase project ref has an unexpected format.'
}

$baseUrl = "https://$projectRef.supabase.co"
$runId = ([guid]::NewGuid().ToString('N')).Substring(0, 12)
$emailA = "codex-google-live-a-$runId@example.invalid"
$emailB = "codex-google-live-b-$runId@example.invalid"
$passwordA = "Tw!$([guid]::NewGuid().ToString('N'))"
$passwordB = "Tw!$([guid]::NewGuid().ToString('N'))"
$createdUserIds = [System.Collections.Generic.List[string]]::new()
$cleanupFailures = 0
$tripId = $null
$watArunItemId = $null
$legacyItemId = $null
$http = [System.Net.Http.HttpClient]::new()
$http.Timeout = [TimeSpan]::FromSeconds(45)

function Assert-True {
  param([bool]$Condition, [string]$Message)
  if (-not $Condition) { throw $Message }
}

function New-Headers {
  param([string]$ApiKey, [string]$Token, [hashtable]$Extra)
  $headers = @{ apikey = $ApiKey }
  if (-not [string]::IsNullOrWhiteSpace($Token)) {
    $headers.Authorization = "Bearer $Token"
  }
  if ($Extra) {
    foreach ($entry in $Extra.GetEnumerator()) { $headers[$entry.Key] = $entry.Value }
  }
  $headers
}

function New-HttpRequest {
  param([string]$Method, [string]$Url, [hashtable]$Headers, $Body)
  $request = [System.Net.Http.HttpRequestMessage]::new(
    [System.Net.Http.HttpMethod]::new($Method), $Url
  )
  foreach ($entry in $Headers.GetEnumerator()) {
    if (-not $request.Headers.TryAddWithoutValidation($entry.Key, [string]$entry.Value)) {
      if ($null -eq $request.Content) {
        $request.Content = [System.Net.Http.StringContent]::new('')
      }
      [void]$request.Content.Headers.TryAddWithoutValidation($entry.Key, [string]$entry.Value)
    }
  }
  if ($null -ne $Body) {
    $json = if ($Body -is [string]) { $Body } else { $Body | ConvertTo-Json -Depth 30 -Compress }
    $request.Content = [System.Net.Http.StringContent]::new(
      $json, [System.Text.Encoding]::UTF8, 'application/json'
    )
  }
  $request
}

function Convert-HttpResponse {
  param([System.Net.Http.HttpResponseMessage]$Response)
  $raw = $Response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
  $body = $null
  if (-not [string]::IsNullOrWhiteSpace($raw)) {
    try { $body = $raw | ConvertFrom-Json } catch { $body = $raw }
  }
  [pscustomobject]@{ Status = [int]$Response.StatusCode; Body = $body; Raw = $raw }
}

function Invoke-Api {
  param([string]$Method, [string]$Path, [hashtable]$Headers, $Body = $null)
  $request = New-HttpRequest -Method $Method -Url "$baseUrl$Path" -Headers $Headers -Body $Body
  try {
    $response = $http.SendAsync($request).GetAwaiter().GetResult()
    try { Convert-HttpResponse -Response $response } finally { $response.Dispose() }
  } finally {
    $request.Dispose()
  }
}

function Assert-Success {
  param($Response, [string]$Context)
  Assert-True ($Response.Status -ge 200 -and $Response.Status -lt 300) "$Context failed with HTTP $($Response.Status)."
}

function Get-Rows {
  param([string]$Table, [string]$Query, [hashtable]$Headers)
  $response = Invoke-Api -Method 'GET' -Path "/rest/v1/$Table`?$Query" -Headers $Headers
  Assert-Success $response "select $Table"
  $rows = @($response.Body)
  Write-Output -NoEnumerate $rows
}

function Get-FunctionErrorCode {
  param($Response)
  if ($null -ne $Response.Body -and $null -ne $Response.Body.PSObject.Properties['error']) {
    return [string]$Response.Body.error.code
  }
  '<none>'
}

$anonKey = $null
$serviceKey = $null
$userA = $null
$userB = $null
$resolvedSnapshot = $null

try {
  $keyJson = npx.cmd --yes supabase projects api-keys --project-ref $projectRef --output json
  if ($LASTEXITCODE -ne 0) { throw 'Unable to obtain linked project API key metadata.' }
  $keys = ($keyJson -join [Environment]::NewLine) | ConvertFrom-Json
  $anonEntry = $keys | Where-Object name -eq 'anon' | Select-Object -First 1
  $serviceEntry = $keys | Where-Object name -eq 'service_role' | Select-Object -First 1
  Assert-True ($null -ne $anonEntry -and $null -ne $serviceEntry) 'Linked API key metadata is incomplete.'
  $anonKey = [string]$anonEntry.api_key
  $serviceKey = [string]$serviceEntry.api_key
  Assert-True (-not [string]::IsNullOrWhiteSpace($anonKey)) 'Linked anon key is unavailable.'
  Assert-True (-not [string]::IsNullOrWhiteSpace($serviceKey)) 'Linked service-role key is unavailable for disposable-user lifecycle.'

  $adminHeaders = New-Headers -ApiKey $serviceKey -Token $serviceKey
  foreach ($identity in @(
    @{email=$emailA;password=$passwordA;label='owner'},
    @{email=$emailB;password=$passwordB;label='cross-user'}
  )) {
    $created = Invoke-Api -Method 'POST' -Path '/auth/v1/admin/users' -Headers $adminHeaders -Body @{
      email=$identity.email
      password=$identity.password
      email_confirm=$true
      user_metadata=@{purpose='Google Places live closure';run_id=$runId;label=$identity.label}
    }
    Assert-Success $created "create disposable $($identity.label) user"
    [void]$createdUserIds.Add([string]$created.Body.id)
  }

  function Sign-In-DisposableUser {
    param([string]$Email, [string]$Password)
    $response = Invoke-Api -Method 'POST' -Path '/auth/v1/token?grant_type=password' -Headers (New-Headers -ApiKey $anonKey) -Body @{email=$Email;password=$Password}
    Assert-Success $response 'disposable user sign-in'
    Assert-True (-not [string]::IsNullOrWhiteSpace([string]$response.Body.access_token)) 'Sign-in returned no access token.'
    $response.Body
  }

  $userA = Sign-In-DisposableUser -Email $emailA -Password $passwordA
  $userB = Sign-In-DisposableUser -Email $emailB -Password $passwordB
  $headersA = New-Headers -ApiKey $anonKey -Token $userA.access_token
  $headersB = New-Headers -ApiKey $anonKey -Token $userB.access_token
  $rpcHeadersA = New-Headers -ApiKey $anonKey -Token $userA.access_token -Extra @{Prefer='return=representation'}
  $anonHeaders = New-Headers -ApiKey $anonKey

  $anonymousResolve = Invoke-Api -Method 'POST' -Path '/functions/v1/resolve-place' -Headers $anonHeaders -Body @{itineraryItemId=[guid]::NewGuid().ToString()}
  Assert-True ($anonymousResolve.Status -eq 401) 'Anonymous resolve-place request was not rejected by the JWT gateway.'

  $graph = @{
    title='Google Places live closure'
    destination='Bangkok, Thailand'
    startDate='2027-02-01'
    endDate='2027-02-01'
    days=@(@{
      dayNumber=1
      date='2027-02-01'
      items=@(
        @{position=1;placeName='Wat Arun';placeQuery='Wat Arun, Bangkok, Thailand'},
        @{position=2;placeName='Legacy provenance fixture';placeQuery='Legacy fixture Bangkok'}
      )
    })
  }
  $create = Invoke-Api -Method 'POST' -Path '/rest/v1/rpc/create_trip_graph' -Headers $rpcHeadersA -Body @{
    p_idempotency_key="google-live-$runId"
    p_graph=$graph
  }
  Assert-Success $create 'persist unresolved Google live graph'
  $tripId = [string]$create.Body
  Assert-True ($tripId -match '^[0-9a-f-]{36}$') 'create_trip_graph did not return a trip UUID.'

  $days = Get-Rows -Table 'itinerary_days' -Query "select=id&trip_id=eq.$tripId" -Headers $headersA
  Assert-True ($days.Count -eq 1) 'Disposable trip day was not persisted.'
  $items = Get-Rows -Table 'itinerary_items' -Query "select=*&itinerary_day_id=eq.$($days[0].id)&order=position.asc" -Headers $headersA
  Assert-True ($items.Count -eq 2) 'Disposable unresolved items were not persisted.'
  $watArunItemId = [string]$items[0].id
  $legacyItemId = [string]$items[1].id
  Assert-True ($null -eq $items[0].google_place_id -and $null -eq $items[0].latitude -and $null -eq $items[0].longitude -and $null -eq $items[0].place_resolved_at) 'Wat Arun item did not start UNRESOLVED.'

  $spoofGraph = @{
    title='Provider spoof attempt';destination='Bangkok';startDate='2027-02-02';endDate='2027-02-02'
    days=@(@{dayNumber=1;date='2027-02-02';items=@(@{
      position=1;placeName='Fake';googlePlaceId='client-fake';latitude=13.7;longitude=100.4;placeAddress='Fake';placeCategory='landmark'
    })})
  }
  $spoofCreate = Invoke-Api -Method 'POST' -Path '/rest/v1/rpc/create_trip_graph' -Headers $rpcHeadersA -Body @{
    p_idempotency_key="google-live-spoof-$runId";p_graph=$spoofGraph
  }
  Assert-True ($spoofCreate.Status -ge 400 -and [string]$spoofCreate.Body.code -eq 'TW001') 'Provider-looking graph creation was not rejected.'

  $firstResolve = Invoke-Api -Method 'POST' -Path '/functions/v1/resolve-place' -Headers $headersA -Body @{itineraryItemId=$watArunItemId}
  Assert-Success $firstResolve 'real Google Places Wat Arun resolution'
  Assert-True ([string]$firstResolve.Body.data.resolution -eq 'VERIFIED') 'First live resolution did not report VERIFIED.'

  $resolvedRows = Get-Rows -Table 'itinerary_items' -Query "select=*&id=eq.$watArunItemId" -Headers $headersA
  Assert-True ($resolvedRows.Count -eq 1) 'Owner could not read resolved Wat Arun item.'
  $resolvedSnapshot = $resolvedRows[0]
  Assert-True (-not [string]::IsNullOrWhiteSpace([string]$resolvedSnapshot.google_place_id)) 'Live snapshot has no Google Place ID.'
  Assert-True (-not [string]::IsNullOrWhiteSpace([string]$resolvedSnapshot.place_name)) 'Live snapshot has no canonical name.'
  Assert-True ($resolvedSnapshot.latitude -is [double] -or $resolvedSnapshot.latitude -is [decimal] -or $resolvedSnapshot.latitude -is [int]) 'Live snapshot latitude is not numeric.'
  Assert-True ($resolvedSnapshot.longitude -is [double] -or $resolvedSnapshot.longitude -is [decimal] -or $resolvedSnapshot.longitude -is [int]) 'Live snapshot longitude is not numeric.'
  Assert-True ([double]$resolvedSnapshot.latitude -ge -90 -and [double]$resolvedSnapshot.latitude -le 90) 'Live latitude is outside the valid range.'
  Assert-True ([double]$resolvedSnapshot.longitude -ge -180 -and [double]$resolvedSnapshot.longitude -le 180) 'Live longitude is outside the valid range.'
  Assert-True (-not [string]::IsNullOrWhiteSpace([string]$resolvedSnapshot.place_resolved_at)) 'Live snapshot has no provenance timestamp.'

  $ownerSnapshotBeforeSpoof = @(
    [string]$resolvedSnapshot.google_place_id,[string]$resolvedSnapshot.place_name,
    [string]$resolvedSnapshot.latitude,[string]$resolvedSnapshot.longitude,
    [string]$resolvedSnapshot.place_address,[string]$resolvedSnapshot.place_category,
    [string]$resolvedSnapshot.place_resolved_at
  ) -join '|'
  foreach ($spoofBody in @(
    @{google_place_id='client-fake-id'},
    @{latitude=1.23;longitude=4.56},
    @{place_address='Client fake address';place_category='park'},
    @{place_resolved_at='2027-01-01T00:00:00Z'}
  )) {
    $spoof = Invoke-Api -Method 'PATCH' -Path "/rest/v1/itinerary_items?id=eq.$watArunItemId" -Headers (New-Headers -ApiKey $anonKey -Token $userA.access_token -Extra @{Prefer='return=representation'}) -Body $spoofBody
    Assert-True ($spoof.Status -ge 400) 'Owner directly mutated a provider-owned field.'
  }
  $afterSpoof = (Get-Rows -Table 'itinerary_items' -Query "select=*&id=eq.$watArunItemId" -Headers $headersA)[0]
  $ownerSnapshotAfterSpoof = @(
    [string]$afterSpoof.google_place_id,[string]$afterSpoof.place_name,
    [string]$afterSpoof.latitude,[string]$afterSpoof.longitude,
    [string]$afterSpoof.place_address,[string]$afterSpoof.place_category,
    [string]$afterSpoof.place_resolved_at
  ) -join '|'
  Assert-True ($ownerSnapshotAfterSpoof -eq $ownerSnapshotBeforeSpoof) 'Spoof attempt changed the verified snapshot.'

  Assert-True ((Get-Rows -Table 'itinerary_items' -Query "select=id&id=eq.$watArunItemId" -Headers $headersB).Count -eq 0) 'Cross-user read exposed the resolved item.'
  $crossResolve = Invoke-Api -Method 'POST' -Path '/functions/v1/resolve-place' -Headers $headersB -Body @{itineraryItemId=$watArunItemId}
  Assert-True ($crossResolve.Status -eq 404 -and (Get-FunctionErrorCode $crossResolve) -eq 'PLACE_NOT_FOUND') 'Cross-user resolver did not return the owner-safe not-found contract.'
  $crossUpdate = Invoke-Api -Method 'PATCH' -Path "/rest/v1/itinerary_items?id=eq.$watArunItemId" -Headers (New-Headers -ApiKey $anonKey -Token $userB.access_token -Extra @{Prefer='return=representation'}) -Body @{google_place_id='cross-user-fake';latitude=1;longitude=1}
  Assert-Success $crossUpdate 'cross-user provider update request'
  Assert-True (@($crossUpdate.Body).Count -eq 0) 'Cross-user provider update affected the owner row.'

  $legacySeed = Invoke-Api -Method 'PATCH' -Path "/rest/v1/itinerary_items?id=eq.$legacyItemId" -Headers (New-Headers -ApiKey $serviceKey -Token $serviceKey -Extra @{Prefer='return=representation'}) -Body @{
    google_place_id='legacy-untrusted-fixture';latitude=13.70;longitude=100.50;place_address='Legacy fixture';place_category='landmark'
  }
  Assert-Success $legacySeed 'seed legacy-untrusted fixture'
  Assert-True (@($legacySeed.Body).Count -eq 1 -and $null -eq $legacySeed.Body[0].place_resolved_at) 'Legacy fixture unexpectedly gained trusted provenance.'
  $detail = Invoke-Api -Method 'POST' -Path '/rest/v1/rpc/get_saved_trip_detail' -Headers $rpcHeadersA -Body @{p_trip_id=$tripId}
  Assert-Success $detail 'owner trip detail provenance check'
  $legacyDetail = @($detail.Body.days[0].items) | Where-Object id -eq $legacyItemId | Select-Object -First 1
  Assert-True ($null -ne $legacyDetail -and [string]$legacyDetail.resolution -eq 'UNRESOLVED') 'Legacy provider-looking row was not reported UNRESOLVED.'
  Assert-True ($null -eq $legacyDetail.PSObject.Properties['googlePlaceId'] -and $null -eq $legacyDetail.PSObject.Properties['latitude'] -and $null -eq $legacyDetail.PSObject.Properties['longitude']) 'Legacy untrusted provider fields leaked through the trusted detail DTO.'

  Start-Sleep -Milliseconds 10
  $refresh = Invoke-Api -Method 'POST' -Path '/functions/v1/resolve-place' -Headers $headersA -Body @{itineraryItemId=$watArunItemId}
  Assert-Success $refresh 'real Google Places refresh'
  Assert-True ([string]$refresh.Body.data.resolution -eq 'VERIFIED_REFRESHED') 'Live refresh did not report VERIFIED_REFRESHED.'
  $refreshed = (Get-Rows -Table 'itinerary_items' -Query "select=*&id=eq.$watArunItemId" -Headers $headersA)[0]
  Assert-True (-not [string]::IsNullOrWhiteSpace([string]$refreshed.google_place_id) -and -not [string]::IsNullOrWhiteSpace([string]$refreshed.place_resolved_at)) 'Live refresh produced a partial snapshot.'
  Assert-True ([datetimeoffset]$refreshed.place_resolved_at -gt [datetimeoffset]$resolvedSnapshot.place_resolved_at) 'Live refresh did not advance the provenance timestamp.'

  $lastKnownGood = @(
    [string]$refreshed.google_place_id,[string]$refreshed.place_name,
    [string]$refreshed.latitude,[string]$refreshed.longitude,
    [string]$refreshed.place_address,[string]$refreshed.place_category,
    [string]$refreshed.place_resolved_at
  ) -join '|'
  $contextFailure = Invoke-Api -Method 'PATCH' -Path "/rest/v1/itinerary_items?id=eq.$watArunItemId" -Headers (New-Headers -ApiKey $anonKey -Token $userA.access_token -Extra @{Prefer='return=representation'}) -Body @{place_query="zzzz-no-such-place-$runId"}
  Assert-Success $contextFailure 'prepare refresh no-match context'
  $destinationFailure = Invoke-Api -Method 'PATCH' -Path "/rest/v1/trips?id=eq.$tripId" -Headers (New-Headers -ApiKey $anonKey -Token $userA.access_token -Extra @{Prefer='return=representation'}) -Body @{destination='McMurdo Station, Antarctica'}
  Assert-Success $destinationFailure 'prepare refresh no-match destination'
  $failedRefresh = Invoke-Api -Method 'POST' -Path '/functions/v1/resolve-place' -Headers $headersA -Body @{itineraryItemId=$watArunItemId}
  $failedRefreshCode = Get-FunctionErrorCode $failedRefresh
  Assert-True ($failedRefresh.Status -ge 400 -and $failedRefreshCode -in @('PLACE_NOT_FOUND','PLACE_AMBIGUOUS','PLACE_PROVIDER_UNAVAILABLE','PLACE_PROVIDER_RATE_LIMITED')) 'Refresh failure did not return a sanitized stable provider error.'
  $afterFailedRefresh = (Get-Rows -Table 'itinerary_items' -Query "select=*&id=eq.$watArunItemId" -Headers $headersA)[0]
  $snapshotAfterFailure = @(
    [string]$afterFailedRefresh.google_place_id,[string]$afterFailedRefresh.place_name,
    [string]$afterFailedRefresh.latitude,[string]$afterFailedRefresh.longitude,
    [string]$afterFailedRefresh.place_address,[string]$afterFailedRefresh.place_category,
    [string]$afterFailedRefresh.place_resolved_at
  ) -join '|'
  Assert-True ($snapshotAfterFailure -eq $lastKnownGood) 'Failed refresh changed the last-known-good verified snapshot.'

  Write-Output ([ordered]@{
    real_provider_call='PASS'
    landmark='Wat Arun, Bangkok, Thailand'
    resolution='VERIFIED'
    refresh='VERIFIED_REFRESHED'
    refresh_failure_preserved='PASS'
    google_place_id=[string]$refreshed.google_place_id
    canonical_place_name=[string]$refreshed.place_name
    latitude=[double]$refreshed.latitude
    longitude=[double]$refreshed.longitude
    place_resolved_at=[string]$refreshed.place_resolved_at
    address_present=(-not [string]::IsNullOrWhiteSpace([string]$refreshed.place_address))
    category_present=(-not [string]::IsNullOrWhiteSpace([string]$refreshed.place_category))
    owner_read='PASS'
    anonymous_denial='PASS'
    cross_user_denial='PASS'
    spoof_prevention='PASS'
    direct_provider_field_mutation='BLOCKED'
    legacy_untrusted='PASS'
  } | ConvertTo-Json -Compress)
  Write-Output 'LIVE_GOOGLE_PLACES_SMOKE_PASS'
} finally {
  if ($null -ne $serviceKey -and $createdUserIds.Count -gt 0) {
    $adminHeaders = New-Headers -ApiKey $serviceKey -Token $serviceKey
    foreach ($userId in $createdUserIds) {
      try {
        $deleted = Invoke-Api -Method 'DELETE' -Path "/auth/v1/admin/users/$userId" -Headers $adminHeaders
        if ($deleted.Status -lt 200 -or $deleted.Status -ge 300) { $cleanupFailures++ }
      } catch { $cleanupFailures++ }
    }
    if ($cleanupFailures -eq 0) {
      try {
        $tripRemaining = if ($null -ne $tripId) { Get-Rows -Table 'trips' -Query "select=id&id=eq.$tripId" -Headers $adminHeaders } else { @() }
        $itemRemaining = if ($null -ne $watArunItemId) { Get-Rows -Table 'itinerary_items' -Query "select=id&id=in.($watArunItemId,$legacyItemId)" -Headers $adminHeaders } else { @() }
        if ($tripRemaining.Count -eq 0 -and $itemRemaining.Count -eq 0) {
          Write-Output 'LIVE_GOOGLE_PLACES_CLEANUP_PASS'
        } else {
          $cleanupFailures++
        }
      } catch { $cleanupFailures++ }
    }
  }
  $http.Dispose()
  $passwordA = $null
  $passwordB = $null
  $anonKey = $null
  $serviceKey = $null
  if ($cleanupFailures -gt 0) {
    Write-Warning 'Exact disposable Google live test cleanup did not fully verify.'
  }
}

