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
$emailA = "codex-be-p4-t006-a-$runId@example.invalid"
$emailB = "codex-be-p4-t006-b-$runId@example.invalid"
$passwordA = "Tw!$([guid]::NewGuid().ToString('N'))"
$passwordB = "Tw!$([guid]::NewGuid().ToString('N'))"
$createdUserIds = [System.Collections.Generic.List[string]]::new()
$cleanupFailures = 0
$http = [System.Net.Http.HttpClient]::new()
$http.Timeout = [TimeSpan]::FromSeconds(30)

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
  param(
    [string]$Method,
    [string]$Url,
    [hashtable]$Headers,
    $Body
  )
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
  param(
    [string]$Method,
    [string]$Path,
    [hashtable]$Headers,
    $Body = $null
  )
  $request = New-HttpRequest -Method $Method -Url "$baseUrl$Path" -Headers $Headers -Body $Body
  try {
    $response = $http.SendAsync($request).GetAwaiter().GetResult()
    try { Convert-HttpResponse -Response $response } finally { $response.Dispose() }
  } finally {
    $request.Dispose()
  }
}

function Start-Api {
  param([string]$Path, [hashtable]$Headers, $Body)
  $request = New-HttpRequest -Method 'POST' -Url "$baseUrl$Path" -Headers $Headers -Body $Body
  [pscustomobject]@{ Request = $request; Task = $http.SendAsync($request) }
}

function Complete-Api {
  param($Pending)
  try {
    $response = $Pending.Task.GetAwaiter().GetResult()
    try { Convert-HttpResponse -Response $response } finally { $response.Dispose() }
  } finally {
    $Pending.Request.Dispose()
  }
}

function Assert-Success {
  param($Response, [string]$Context)
  Assert-True ($Response.Status -ge 200 -and $Response.Status -lt 300) "$Context failed with HTTP $($Response.Status): $($Response.Raw)"
}

function Assert-StableError {
  param($Response, [string]$Code, [string]$Message, [string]$Context)
  Assert-True ($Response.Status -ge 400) "$Context unexpectedly succeeded."
  Assert-True ($null -ne $Response.Body) "$Context returned no error body."
  Assert-True ($Response.Body.code -eq $Code) "$Context returned code '$($Response.Body.code)' instead of '$Code'."
  Assert-True ($Response.Body.message -eq $Message) "$Context returned an unsafe/unexpected message."
  Assert-True ([string]::IsNullOrWhiteSpace([string]$Response.Body.details)) "$Context leaked error details."
  Assert-True ([string]::IsNullOrWhiteSpace([string]$Response.Body.hint)) "$Context leaked an error hint."
}

function Get-BodyCode {
  param($Response)
  if ($null -ne $Response.Body -and $null -ne $Response.Body.PSObject.Properties['code']) {
    return [string]$Response.Body.PSObject.Properties['code'].Value
  }
  '<none>'
}

function Get-Rows {
  param([string]$Table, [string]$Query, [hashtable]$Headers)
  $response = Invoke-Api -Method 'GET' -Path "/rest/v1/$Table`?$Query" -Headers $Headers
  Assert-Success $response "select $Table"
  $rows = @($response.Body)
  Write-Output -NoEnumerate $rows
}

$anonKey = $null
$serviceKey = $null
$userA = $null
$userB = $null

try {
  $keyJson = npx.cmd --yes supabase projects api-keys --project-ref $projectRef --output json
  if ($LASTEXITCODE -ne 0) { throw 'Unable to obtain linked project API key metadata.' }
  $keys = ($keyJson -join [Environment]::NewLine) | ConvertFrom-Json
  $anonEntry = $keys | Where-Object { $_.name -eq 'anon' } | Select-Object -First 1
  $serviceEntry = $keys | Where-Object { $_.name -eq 'service_role' } | Select-Object -First 1
  Assert-True ($null -ne $anonEntry -and $null -ne $anonEntry.PSObject.Properties['api_key']) 'Linked project anon key metadata is unavailable.'
  Assert-True ($null -ne $serviceEntry -and $null -ne $serviceEntry.PSObject.Properties['api_key']) 'Linked project service-role key metadata is unavailable.'
  $anonKey = [string]$anonEntry.PSObject.Properties['api_key'].Value
  $serviceKey = [string]$serviceEntry.PSObject.Properties['api_key'].Value
  Assert-True (-not [string]::IsNullOrWhiteSpace($anonKey)) 'Linked project anon key is unavailable.'
  Assert-True (-not [string]::IsNullOrWhiteSpace($serviceKey)) 'Linked project service-role key is unavailable for test-user lifecycle only.'

  $adminHeaders = New-Headers -ApiKey $serviceKey -Token $serviceKey
  foreach ($identity in @(
    @{ email=$emailA; password=$passwordA; label='A' },
    @{ email=$emailB; password=$passwordB; label='B' }
  )) {
    $created = Invoke-Api -Method 'POST' -Path '/auth/v1/admin/users' -Headers $adminHeaders -Body @{
      email = $identity.email
      password = $identity.password
      email_confirm = $true
      user_metadata = @{ purpose='BE-P4-T006 remote smoke'; run_id=$runId; label=$identity.label }
    }
    Assert-Success $created "create test user $($identity.label)"
    [void]$createdUserIds.Add([string]$created.Body.id)
  }

  function Sign-In-TestUser {
    param([string]$Email, [string]$Password)
    $response = Invoke-Api -Method 'POST' -Path '/auth/v1/token?grant_type=password' -Headers (New-Headers -ApiKey $anonKey) -Body @{ email=$Email; password=$Password }
    Assert-Success $response 'test user sign-in'
    Assert-True (-not [string]::IsNullOrWhiteSpace([string]$response.Body.access_token)) 'Sign-in returned no access token.'
    $response.Body
  }

  $userA = Sign-In-TestUser -Email $emailA -Password $passwordA
  $userB = Sign-In-TestUser -Email $emailB -Password $passwordB
  $headersA = New-Headers -ApiKey $anonKey -Token $userA.access_token
  $headersB = New-Headers -ApiKey $anonKey -Token $userB.access_token
  $anonHeaders = New-Headers -ApiKey $anonKey
  $rpcHeadersA = New-Headers -ApiKey $anonKey -Token $userA.access_token -Extra @{ Prefer='return=representation' }
  $rpcHeadersB = New-Headers -ApiKey $anonKey -Token $userB.access_token -Extra @{ Prefer='return=representation' }

  $profileA = Get-Rows -Table 'profiles' -Query "select=id&id=eq.$($userA.user.id)" -Headers $headersA
  $profileAFromB = Get-Rows -Table 'profiles' -Query "select=id&id=eq.$($userA.user.id)" -Headers $headersB
  Assert-True ($profileA.Count -eq 1 -and $profileAFromB.Count -eq 0) 'Remote profile RLS isolation failed.'
  $profileUpdateA = Invoke-Api -Method 'PATCH' -Path "/rest/v1/profiles?id=eq.$($userA.user.id)" -Headers (New-Headers -ApiKey $anonKey -Token $userA.access_token -Extra @{Prefer='return=representation'}) -Body @{display_name='Remote QA owner'}
  Assert-Success $profileUpdateA 'owner profile update'
  Assert-True (@($profileUpdateA.Body).Count -eq 1) 'Owner profile update did not affect exactly one row.'
  $profileUpdateB = Invoke-Api -Method 'PATCH' -Path "/rest/v1/profiles?id=eq.$($userA.user.id)" -Headers (New-Headers -ApiKey $anonKey -Token $userB.access_token -Extra @{Prefer='return=representation'}) -Body @{display_name='Cross-user profile'}
  Assert-Success $profileUpdateB 'cross-user profile update request'
  Assert-True (@($profileUpdateB.Body).Count -eq 0) 'User B updated user A profile.'

  # One safe live Gemini call verifies authenticated provider behavior and the
  # generation-only invariant. This does not persist the generated response.
  $generateTripCountBefore = (Get-Rows -Table 'trips' -Query 'select=id' -Headers $headersA).Count
  $generated = Invoke-Api -Method 'POST' -Path '/functions/v1/generate-trip' -Headers $headersA -Body @{
    destination='Bangkok'; startDate='2027-01-15'; endDate='2027-01-15'; travelers=1; preferences=@('culture')
  }
  Assert-Success $generated 'authenticated live Gemini generation'
  Assert-True ($null -ne $generated.Body.data -and @($generated.Body.data.days).Count -eq 1 -and @($generated.Body.data.days[0].items).Count -ge 1) 'Gemini response did not satisfy the one-day structured contract.'
  Assert-True ((Get-Rows -Table 'trips' -Query 'select=id' -Headers $headersA).Count -eq $generateTripCountBefore) 'generate-trip wrote to the database.'

  $graph = @{
    title='T006 remote trip'; destination='Bangkok'
    startDate='2027-09-01'; endDate='2027-09-02'
    estimatedBudget=800; currency='USD'
    days=@(
      @{ dayNumber=1; date='2027-09-01'; summary='Arrival'; items=@(
        @{ position=1; placeName='Wat Arun'; placeQuery='Wat Arun Bangkok'; startTime='09:00'; endTime='10:00'; note='Unresolved' },
        @{ position=2; placeName='Grand Palace'; placeQuery='Grand Palace Bangkok' }
      ) },
      @{ dayNumber=2; date='2027-09-02'; summary='Markets'; items=@(
        @{ position=1; placeName='Chatuchak Market'; placeQuery='Chatuchak Bangkok' },
        @{ position=2; placeName='Lumphini Park' }
      ) }
    )
  }
  $key = "t006-$runId-happy"
  $rpcBody = @{ p_idempotency_key=$key; p_graph=$graph }
  $createdTrip = Invoke-Api -Method 'POST' -Path '/rest/v1/rpc/create_trip_graph' -Headers $rpcHeadersA -Body $rpcBody
  Assert-Success $createdTrip 'remote create_trip_graph happy path'
  $tripId = [string]$createdTrip.Body
  Assert-True ($tripId -match '^[0-9a-f-]{36}$') 'RPC did not return a UUID.'

  $tripRows = Get-Rows -Table 'trips' -Query "select=*&id=eq.$tripId" -Headers $headersA
  Assert-True ($tripRows.Count -eq 1) 'User A trip row missing.'
  Assert-True ($tripRows[0].user_id -eq $userA.user.id) 'Persisted owner does not match auth.uid().'
  Assert-True ($tripRows[0].title -eq 'T006 remote trip' -and $tripRows[0].destination -eq 'Bangkok') 'Trip fields mismatch.'
  Assert-True ($tripRows[0].idempotency_key -eq $key -and -not [string]::IsNullOrWhiteSpace([string]$tripRows[0].idempotency_request_hash)) 'Trip idempotency metadata missing.'

  $dayRows = Get-Rows -Table 'itinerary_days' -Query "select=*&trip_id=eq.$tripId&order=day_number.asc" -Headers $headersA
  Assert-True ($dayRows.Count -eq 2 -and $dayRows[0].day_number -eq 1 -and $dayRows[1].day_number -eq 2) 'Persisted days mismatch.'
  $dayIds = @($dayRows | ForEach-Object id)
  $dayFilter = [string]::Join(',', $dayIds)
  $itemRows = Get-Rows -Table 'itinerary_items' -Query "select=*&itinerary_day_id=in.($dayFilter)&order=position.asc" -Headers $headersA
  Assert-True ($itemRows.Count -eq 4) 'Persisted item count mismatch.'
  $unresolved = $itemRows | Where-Object place_name -eq 'Wat Arun'
  $unresolvedGrandPalace = $itemRows | Where-Object place_name -eq 'Grand Palace'
  Assert-True ($null -eq $unresolved.latitude -and $null -eq $unresolved.longitude -and $unresolved.place_query -eq 'Wat Arun Bangkok') 'Unresolved remote item mismatch.'
  Assert-True ($null -eq $unresolvedGrandPalace.latitude -and $null -eq $unresolvedGrandPalace.longitude -and $null -eq $unresolvedGrandPalace.google_place_id -and $null -eq $unresolvedGrandPalace.place_resolved_at) 'Graph creation produced a trusted-looking snapshot.'

  $listPage = Invoke-Api -Method 'POST' -Path '/rest/v1/rpc/list_saved_trips' -Headers $rpcHeadersA -Body @{ p_limit=1; p_cursor_created_at=$null; p_cursor_id=$null }
  Assert-Success $listPage 'remote saved-trip list'
  Assert-True (@($listPage.Body.items).Count -eq 1 -and $listPage.Body.items[0].id -eq $tripId) 'Remote compact list did not return owner trip.'
  Assert-True ($null -eq $listPage.Body.items[0].PSObject.Properties['idempotencyKey'] -and $null -eq $listPage.Body.items[0].PSObject.Properties['userId']) 'Remote list leaked internal metadata.'
  $detailA = Invoke-Api -Method 'POST' -Path '/rest/v1/rpc/get_saved_trip_detail' -Headers $rpcHeadersA -Body @{ p_trip_id=$tripId }
  Assert-Success $detailA 'remote saved-trip detail'
  Assert-True ($detailA.Body.id -eq $tripId -and @($detailA.Body.days).Count -eq 2 -and @($detailA.Body.days[0].items).Count -eq 2) 'Remote detail graph shape mismatch.'
  Assert-True ($detailA.Body.days[0].items[0].resolution -eq 'UNRESOLVED' -and $null -eq $detailA.Body.days[0].items[0].PSObject.Properties['googlePlaceId']) 'Remote detail misrepresented unresolved provenance.'
  $detailB = Invoke-Api -Method 'POST' -Path '/rest/v1/rpc/get_saved_trip_detail' -Headers $rpcHeadersB -Body @{ p_trip_id=$tripId }
  Assert-Success $detailB 'cross-user saved-trip detail'
  Assert-True ($null -eq $detailB.Body) 'User B read user A detail RPC.'
  $noteA = Invoke-Api -Method 'POST' -Path '/rest/v1/rpc/update_itinerary_item_note' -Headers $rpcHeadersA -Body @{ p_item_id=$unresolved.id; p_note='Remote updated note' }
  Assert-Success $noteA 'remote note update'
  Assert-True ($noteA.Body -eq $true) 'Owner note RPC did not update.'
  $noteB = Invoke-Api -Method 'POST' -Path '/rest/v1/rpc/update_itinerary_item_note' -Headers $rpcHeadersB -Body @{ p_item_id=$unresolved.id; p_note='Cross-user note' }
  Assert-Success $noteB 'cross-user note update'
  Assert-True ($noteB.Body -eq $false) 'User B updated user A note RPC.'

  $crossUserResolve = Invoke-Api -Method 'POST' -Path '/functions/v1/resolve-place' -Headers $headersB -Body @{ itineraryItemId=$unresolved.id }
  $crossUserResolveCode = if ($null -ne $crossUserResolve.Body -and $null -ne $crossUserResolve.Body.PSObject.Properties['error']) { [string]$crossUserResolve.Body.error.code } else { '<none>' }
  Assert-True ($crossUserResolve.Status -eq 404 -and $crossUserResolveCode -eq 'PLACE_NOT_FOUND') "User B resolved user A item: HTTP $($crossUserResolve.Status): $($crossUserResolve.Raw)"

  # Owner live-provider behavior is covered by the focused reusable smoke at
  # supabase/tests/place-resolution/remote-live-smoke.ps1. This broad suite
  # intentionally avoids another billable provider call.
  $providerSpoof = Invoke-Api -Method 'PATCH' -Path "/rest/v1/itinerary_items?id=eq.$($unresolved.id)" -Headers (New-Headers -ApiKey $anonKey -Token $userA.access_token -Extra @{Prefer='return=representation'}) -Body @{ google_place_id='client-fake'; latitude=13.7; longitude=100.4; place_resolved_at='2026-08-20T00:00:00Z' }
  Assert-True ($providerSpoof.Status -ge 400) 'Authenticated client wrote provider metadata directly.'

  $retry = Invoke-Api -Method 'POST' -Path '/rest/v1/rpc/create_trip_graph' -Headers $rpcHeadersA -Body $rpcBody
  Assert-Success $retry 'remote idempotency retry'
  Assert-True ([string]$retry.Body -eq $tripId) 'Remote retry returned a different UUID.'
  Assert-True ((Get-Rows -Table 'trips' -Query "select=id&idempotency_key=eq.$key" -Headers $headersA).Count -eq 1) 'Remote retry duplicated the trip.'

  $changedGraph = $graph.Clone(); $changedGraph.title = 'Changed conflict payload'
  $conflict = Invoke-Api -Method 'POST' -Path '/rest/v1/rpc/create_trip_graph' -Headers $rpcHeadersA -Body @{ p_idempotency_key=$key; p_graph=$changedGraph }
  Assert-StableError $conflict 'TW004' 'The idempotency key is already associated with a different request.' 'remote idempotency conflict'

  $beforeInvalid = (Get-Rows -Table 'trips' -Query 'select=id' -Headers $headersA).Count
  foreach ($invalid in @(
    @{ key="t006-$runId-spoof-userid"; graph=($graph.Clone() + @{ userId=$userB.user.id }) },
    @{ key="t006-$runId-spoof-user-id"; graph=($graph.Clone() + @{ user_id=$userB.user.id }) },
    @{ key="t006-$runId-half-coordinate"; graph=@{ title='Invalid'; destination='X'; startDate='2027-10-01'; endDate='2027-10-01'; days=@(@{dayNumber=1;date='2027-10-01';items=@(@{position=1;placeName='X';latitude=10})}) } },
    @{ key="t006-$runId-ordering"; graph=@{ title='Invalid'; destination='X'; startDate='2027-10-01'; endDate='2027-10-02'; days=@(@{dayNumber=1;date='2027-10-01';items=@(@{position=1;placeName='X'})},@{dayNumber=3;date='2027-10-02';items=@(@{position=1;placeName='Y'})}) } }
  )) {
    $invalidResponse = Invoke-Api -Method 'POST' -Path '/rest/v1/rpc/create_trip_graph' -Headers $rpcHeadersA -Body @{ p_idempotency_key=$invalid.key; p_graph=$invalid.graph }
    Assert-StableError $invalidResponse 'TW001' 'Trip persistence input is invalid.' "invalid graph $($invalid.key)"
  }
  Assert-True ((Get-Rows -Table 'trips' -Query 'select=id' -Headers $headersA).Count -eq $beforeInvalid) 'Invalid remote graphs caused writes.'

  $bTripView = Get-Rows -Table 'trips' -Query "select=*&id=eq.$tripId" -Headers $headersB
  $bDayView = Get-Rows -Table 'itinerary_days' -Query "select=*&trip_id=eq.$tripId" -Headers $headersB
  $bItemView = Get-Rows -Table 'itinerary_items' -Query "select=*&itinerary_day_id=in.($dayFilter)" -Headers $headersB
  Assert-True ($bTripView.Count -eq 0 -and $bDayView.Count -eq 0 -and $bItemView.Count -eq 0) 'User B observed user A graph.'

  $mutateHeadersB = New-Headers -ApiKey $anonKey -Token $userB.access_token -Extra @{ Prefer='return=representation' }
  $bUpdate = Invoke-Api -Method 'PATCH' -Path "/rest/v1/trips?id=eq.$tripId" -Headers $mutateHeadersB -Body @{ title='Cross-user update' }
  Assert-Success $bUpdate 'cross-user update request'
  Assert-True (@($bUpdate.Body).Count -eq 0) 'User B updated user A trip.'
  $bDelete = Invoke-Api -Method 'DELETE' -Path "/rest/v1/trips?id=eq.$tripId" -Headers $mutateHeadersB
  Assert-Success $bDelete 'cross-user delete request'
  Assert-True (@($bDelete.Body).Count -eq 0) 'User B deleted user A trip.'
  $bDayInsert = Invoke-Api -Method 'POST' -Path '/rest/v1/itinerary_days' -Headers $mutateHeadersB -Body @{ trip_id=$tripId; day_number=99; date='2027-09-01' }
  Assert-True ($bDayInsert.Status -ge 400) 'User B inserted a day into user A graph.'
  $bItemInsert = Invoke-Api -Method 'POST' -Path '/rest/v1/itinerary_items' -Headers $mutateHeadersB -Body @{ itinerary_day_id=$dayIds[0]; position=99; place_name='Cross-user item' }
  Assert-True ($bItemInsert.Status -ge 400) 'User B inserted an item into user A graph.'
  $bDayUpdate = Invoke-Api -Method 'PATCH' -Path "/rest/v1/itinerary_days?id=eq.$($dayIds[0])" -Headers $mutateHeadersB -Body @{summary='Cross-user day'}
  $bItemUpdate = Invoke-Api -Method 'PATCH' -Path "/rest/v1/itinerary_items?id=eq.$($unresolved.id)" -Headers $mutateHeadersB -Body @{note='Cross-user direct item'}
  $bDayDelete = Invoke-Api -Method 'DELETE' -Path "/rest/v1/itinerary_days?id=eq.$($dayIds[0])" -Headers $mutateHeadersB
  $bItemDelete = Invoke-Api -Method 'DELETE' -Path "/rest/v1/itinerary_items?id=eq.$($unresolved.id)" -Headers $mutateHeadersB
  foreach ($crossMutation in @($bDayUpdate,$bItemUpdate,$bDayDelete,$bItemDelete)) {
    Assert-Success $crossMutation 'cross-user child mutation request'
    Assert-True (@($crossMutation.Body).Count -eq 0) 'Cross-user child update/delete affected user A data.'
  }

  $userBCreate = Invoke-Api -Method 'POST' -Path '/rest/v1/rpc/create_trip_graph' -Headers $rpcHeadersB -Body $rpcBody
  Assert-Success $userBCreate 'same key under different owner'
  Assert-True ([string]$userBCreate.Body -ne $tripId) 'Owner-scoped key returned user A trip to user B.'

  $anonymous = Invoke-Api -Method 'POST' -Path '/rest/v1/rpc/create_trip_graph' -Headers $anonHeaders -Body @{ p_idempotency_key="t006-$runId-anon"; p_graph=$graph }
  Assert-True ($anonymous.Status -ge 400) 'Anonymous caller persisted a graph.'
  $invalidTokenHeaders = New-Headers -ApiKey $anonKey -Token 'not-a-valid-jwt'
  $invalidToken = Invoke-Api -Method 'POST' -Path '/rest/v1/rpc/create_trip_graph' -Headers $invalidTokenHeaders -Body @{ p_idempotency_key="t006-$runId-invalid-jwt"; p_graph=$graph }
  Assert-True ($invalidToken.Status -ge 400) 'Malformed JWT persisted a graph.'
  $anonymousGenerate = Invoke-Api -Method 'POST' -Path '/functions/v1/generate-trip' -Headers $anonHeaders -Body @{destination='Bangkok';startDate='2027-01-15';endDate='2027-01-15'}
  $invalidGenerate = Invoke-Api -Method 'POST' -Path '/functions/v1/generate-trip' -Headers $invalidTokenHeaders -Body @{destination='Bangkok';startDate='2027-01-15';endDate='2027-01-15'}
  $anonymousResolve = Invoke-Api -Method 'POST' -Path '/functions/v1/resolve-place' -Headers $anonHeaders -Body @{itineraryItemId=$unresolved.id}
  $invalidResolve = Invoke-Api -Method 'POST' -Path '/functions/v1/resolve-place' -Headers $invalidTokenHeaders -Body @{itineraryItemId=$unresolved.id}
  Assert-True ($anonymousGenerate.Status -eq 401 -and $invalidGenerate.Status -eq 401 -and $anonymousResolve.Status -eq 401 -and $invalidResolve.Status -eq 401) 'Edge Function JWT gateway accepted anonymous or malformed tokens.'
  foreach ($table in @('profiles','trips','itinerary_days','itinerary_items')) {
    $anonymousRead = Invoke-Api -Method 'GET' -Path "/rest/v1/$table`?select=*" -Headers $anonHeaders
    Assert-True ($anonymousRead.Status -ge 400) "Anonymous SELECT unexpectedly reached $table."
  }
  foreach ($anonymousMutation in @(
    (Invoke-Api -Method 'POST' -Path '/rest/v1/trips' -Headers $anonHeaders -Body @{user_id=$userA.user.id;title='Anonymous';destination='X';start_date='2027-01-01';end_date='2027-01-01'}),
    (Invoke-Api -Method 'PATCH' -Path "/rest/v1/profiles?id=eq.$($userA.user.id)" -Headers $anonHeaders -Body @{display_name='Anonymous'}),
    (Invoke-Api -Method 'DELETE' -Path "/rest/v1/trips?id=eq.$tripId" -Headers $anonHeaders),
    (Invoke-Api -Method 'PATCH' -Path "/rest/v1/itinerary_days?id=eq.$($dayIds[0])" -Headers $anonHeaders -Body @{summary='Anonymous'}),
    (Invoke-Api -Method 'DELETE' -Path "/rest/v1/itinerary_items?id=eq.$($unresolved.id)" -Headers $anonHeaders)
  )) {
    Assert-True ($anonymousMutation.Status -ge 400) 'Anonymous table mutation unexpectedly succeeded.'
  }
  $oldRpc = Invoke-Api -Method 'POST' -Path '/rest/v1/rpc/create_trip_graph' -Headers $rpcHeadersA -Body @{ p_graph=$graph }
  Assert-True ($oldRpc.Status -ge 400) 'Old non-idempotent RPC signature remains callable.'
  $privateSchema = Invoke-Api -Method 'GET' -Path '/rest/v1/' -Headers (New-Headers -ApiKey $anonKey -Token $userA.access_token -Extra @{ 'Accept-Profile'='tripwise_private' })
  Assert-True ($privateSchema.Status -ge 400) 'tripwise_private is exposed by PostgREST.'

  # Real concurrent API calls: same key/payload.
  $concurrentSameKey = "t006-$runId-concurrent-same"
  $sameBody = @{ p_idempotency_key=$concurrentSameKey; p_graph=$graph }
  $samePendingA = Start-Api -Path '/rest/v1/rpc/create_trip_graph' -Headers $rpcHeadersA -Body $sameBody
  $samePendingB = Start-Api -Path '/rest/v1/rpc/create_trip_graph' -Headers $rpcHeadersA -Body $sameBody
  $sameA = Complete-Api $samePendingA
  $sameB = Complete-Api $samePendingB
  Assert-Success $sameA 'concurrent same request A'
  Assert-Success $sameB 'concurrent same request B'
  Assert-True ([string]$sameA.Body -eq [string]$sameB.Body) 'Concurrent same-payload calls returned different UUIDs.'
  Assert-True ((Get-Rows -Table 'trips' -Query "select=id&idempotency_key=eq.$concurrentSameKey" -Headers $headersA).Count -eq 1) 'Concurrent same-payload calls created duplicates.'

  # Same key, different payload: exactly one success and one TW004.
  $concurrentDiffKey = "t006-$runId-concurrent-diff"
  $diffGraphA = $graph.Clone(); $diffGraphA.title='Concurrent winner A'
  $diffGraphB = $graph.Clone(); $diffGraphB.title='Concurrent winner B'
  $diffPendingA = Start-Api -Path '/rest/v1/rpc/create_trip_graph' -Headers $rpcHeadersA -Body @{p_idempotency_key=$concurrentDiffKey;p_graph=$diffGraphA}
  $diffPendingB = Start-Api -Path '/rest/v1/rpc/create_trip_graph' -Headers $rpcHeadersA -Body @{p_idempotency_key=$concurrentDiffKey;p_graph=$diffGraphB}
  $diffA = Complete-Api $diffPendingA
  $diffB = Complete-Api $diffPendingB
  $diffResponses = @($diffA,$diffB)
  Assert-True (@($diffResponses | Where-Object { $_.Status -ge 200 -and $_.Status -lt 300 }).Count -eq 1) 'Concurrent different-payload race did not have one winner.'
  $diffConflict = $diffResponses | Where-Object { $_.Status -ge 400 } | Select-Object -First 1
  Assert-StableError $diffConflict 'TW004' 'The idempotency key is already associated with a different request.' 'concurrent different-payload conflict'
  Assert-True ((Get-Rows -Table 'trips' -Query "select=id&idempotency_key=eq.$concurrentDiffKey" -Headers $headersA).Count -eq 1) 'Concurrent conflict persisted more than one graph.'

  # Direct own-row writes remain possible; they are owner-safe but bypass graph atomicity.
  $directTrip = Invoke-Api -Method 'POST' -Path '/rest/v1/trips' -Headers (New-Headers -ApiKey $anonKey -Token $userA.access_token -Extra @{Prefer='return=representation'}) -Body @{
    user_id=$userA.user.id; title='T006 direct-write audit'; destination='Audit'; start_date='2027-11-01'; end_date='2027-11-01'
  }
  Assert-Success $directTrip 'direct own trip insert audit'
  Assert-True (@($directTrip.Body).Count -eq 1) 'Direct own trip insert did not return one row.'
  $directDay = Invoke-Api -Method 'POST' -Path '/rest/v1/itinerary_days' -Headers (New-Headers -ApiKey $anonKey -Token $userA.access_token -Extra @{Prefer='return=representation'}) -Body @{trip_id=$directTrip.Body[0].id;day_number=1;date='2027-11-01'}
  Assert-Success $directDay 'direct own day insert audit'
  $directItem = Invoke-Api -Method 'POST' -Path '/rest/v1/itinerary_items' -Headers (New-Headers -ApiKey $anonKey -Token $userA.access_token -Extra @{Prefer='return=representation'}) -Body @{itinerary_day_id=$directDay.Body[0].id;position=1;place_name='Direct unresolved'}
  Assert-Success $directItem 'direct own item insert audit'
  $deleteA = Invoke-Api -Method 'POST' -Path '/rest/v1/rpc/delete_saved_trip' -Headers $rpcHeadersA -Body @{p_trip_id=$directTrip.Body[0].id}
  Assert-Success $deleteA 'remote saved-trip delete'
  $deleteAgain = Invoke-Api -Method 'POST' -Path '/rest/v1/rpc/delete_saved_trip' -Headers $rpcHeadersA -Body @{p_trip_id=$directTrip.Body[0].id}
  Assert-Success $deleteAgain 'remote repeated saved-trip delete'
  Assert-True ($deleteA.Body -eq $true -and $deleteAgain.Body -eq $false) 'Remote delete idempotency contract failed.'
  Assert-True ((Get-Rows -Table 'itinerary_days' -Query "select=id&trip_id=eq.$($directTrip.Body[0].id)" -Headers $headersA).Count -eq 0) 'Remote delete did not cascade.'

  Write-Output ([ordered]@{
    project_ref=$projectRef
    happy_path='PASS'
    returned_uuid=$tripId
    persisted_counts='1 trip / 2 days / 4 items'
    owner_auth_uid='PASS'
    unresolved_null_pair='PASS'
    provider_snapshot_spoofing='BLOCKED'
    resolver_live_smoke='SEPARATE_FOCUSED_SUITE'
    retry_same_uuid='PASS'
    conflict_tw004='PASS'
    conflict_transport="HTTP $($conflict.Status) / $(Get-BodyCode $conflict)"
    validation_tw001='PASS'
    validation_transport="HTTP $($invalidResponse.Status) / $(Get-BodyCode $invalidResponse)"
    rls_user_a_b='PASS'
    cross_user_child_transport="day HTTP $($bDayInsert.Status) / $(Get-BodyCode $bDayInsert); item HTTP $($bItemInsert.Status) / $(Get-BodyCode $bItemInsert)"
    anonymous_blocked='PASS'
    anonymous_transport="HTTP $($anonymous.Status) / $(Get-BodyCode $anonymous)"
    invalid_jwt_blocked='PASS'
    invalid_jwt_transport="HTTP $($invalidToken.Status) / $(Get-BodyCode $invalidToken)"
    old_rpc_blocked='PASS'
    old_rpc_transport="HTTP $($oldRpc.Status) / $(Get-BodyCode $oldRpc)"
    private_schema_blocked='PASS'
    private_schema_transport="HTTP $($privateSchema.Status) / $(Get-BodyCode $privateSchema)"
    concurrency_same='PASS'
    concurrency_conflict='PASS'
    direct_write_provider_spoofing='BLOCKED'
    cross_user_resolver='BLOCKED'
    live_gemini_generation='PASS'
    generation_zero_db_writes='PASS'
    edge_function_jwt_matrix='PASS'
    saved_trip_list_detail='PASS'
    saved_trip_mutations='PASS'
    profile_rls='PASS'
    table_rls_operation_matrix='PASS'
  } | ConvertTo-Json -Compress)
}
finally {
  if ($null -ne $serviceKey -and $createdUserIds.Count -gt 0) {
    $adminHeaders = New-Headers -ApiKey $serviceKey -Token $serviceKey
    foreach ($userId in $createdUserIds) {
      try {
        $deleted = Invoke-Api -Method 'DELETE' -Path "/auth/v1/admin/users/$userId" -Headers $adminHeaders
        if ($deleted.Status -lt 200 -or $deleted.Status -ge 300) {
          $cleanupFailures++
          Write-Warning "Cleanup failed for an exact T006 test user id: $userId"
        }
      } catch {
        $cleanupFailures++
        Write-Warning "Cleanup request failed for an exact T006 test user id: $userId"
      }
    }
    if ($cleanupFailures -eq 0) {
      $userFilter = [string]::Join(',', $createdUserIds)
      try {
        $remaining = Invoke-Api -Method 'GET' -Path "/rest/v1/trips?select=id&user_id=in.($userFilter)" -Headers $adminHeaders
        if ($remaining.Status -ge 200 -and $remaining.Status -lt 300 -and @($remaining.Body).Count -eq 0) {
          Write-Output 'REMOTE_CLEANUP_PASS'
        } else {
          Write-Warning 'Exact T006 test-user cleanup completed, but cascade verification did not pass.'
        }
      } catch {
        Write-Warning 'Exact T006 test-user cleanup completed, but cascade verification request failed.'
      }
    }
  }
  $http.Dispose()
  $passwordA = $null
  $passwordB = $null
  $anonKey = $null
  $serviceKey = $null
}
