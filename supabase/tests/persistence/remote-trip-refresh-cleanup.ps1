[CmdletBinding()]
param(
  [Parameter(Mandatory)][ValidatePattern('^[a-f0-9]{12}$')][string]$RunId,
  [Parameter(Mandatory)][string]$EvidenceFile
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Add-Type -AssemblyName System.Net.Http

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
$projectRef = (Get-Content -LiteralPath (Join-Path $repoRoot 'supabase\.temp\project-ref') -Raw).Trim()
if ($projectRef -ne 'bvblyrzbkyhcreimuumu') { throw 'Linked target differs from authorized TripWise project.' }
$baseUrl = "https://$projectRef.supabase.co"
$expectedTitle = "T004 disposable $RunId"
$keys = npx.cmd --yes supabase projects api-keys --project-ref $projectRef --output json | ConvertFrom-Json
$serviceKey = [string](($keys | Where-Object name -eq 'service_role' | Select-Object -First 1).api_key)
if (-not $serviceKey) { throw 'Service role key metadata unavailable.' }
$headers = @{ apikey = $serviceKey; Authorization = "Bearer $serviceKey" }

$http = [System.Net.Http.HttpClient]::new()
$http.Timeout = [TimeSpan]::FromSeconds(30)
function Invoke-Api([string]$Method, [string]$Path, $Body = $null) {
  $request = [System.Net.Http.HttpRequestMessage]::new([System.Net.Http.HttpMethod]::new($Method), "$baseUrl$Path")
  foreach ($entry in $headers.GetEnumerator()) { [void]$request.Headers.TryAddWithoutValidation($entry.Key, [string]$entry.Value) }
  if ($null -ne $Body) {
    $request.Content = [System.Net.Http.StringContent]::new(($Body | ConvertTo-Json -Depth 10 -Compress), [Text.Encoding]::UTF8, 'application/json')
  }
  try {
    $response = $http.SendAsync($request).GetAwaiter().GetResult()
    try {
      $raw = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
      $parsed = if ($raw) { $raw | ConvertFrom-Json } else { $null }
      [pscustomobject]@{ Status = [int]$response.StatusCode; Body = $parsed }
    } finally { $response.Dispose() }
  } finally { $request.Dispose() }
}

try {
  $usersResponse = Invoke-Api 'GET' '/auth/v1/admin/users?per_page=1000'
  if ($usersResponse.Status -ne 200) { throw "Admin user listing failed with HTTP $($usersResponse.Status)." }
  $users = @($usersResponse.Body.users | Where-Object {
    $_.user_metadata -and $_.user_metadata.PSObject.Properties['run_id'] -and $_.user_metadata.run_id -eq $RunId
  })
  $deletedTrips = 0
  $deletedUsers = 0
  $failures = [System.Collections.Generic.List[string]]::new()
  foreach ($user in $users) {
    $trips = Invoke-Api 'GET' "/rest/v1/trips?select=id,title&user_id=eq.$($user.id)"
    if ($trips.Status -ne 200) { [void]$failures.Add('trip-list'); continue }
    foreach ($trip in @($trips.Body | Where-Object title -eq $expectedTitle)) {
      $deleted = Invoke-Api 'DELETE' "/rest/v1/trips?id=eq.$($trip.id)" $null
      if ($deleted.Status -ge 200 -and $deleted.Status -lt 300) { $deletedTrips++ } else { [void]$failures.Add("trip-delete-http-$($deleted.Status)") }
    }
    $userDelete = Invoke-Api 'DELETE' "/auth/v1/admin/users/$($user.id)"
    if ($userDelete.Status -ge 200 -and $userDelete.Status -lt 300) { $deletedUsers++ } else { [void]$failures.Add("user-delete-http-$($userDelete.Status)") }
  }
  $verifyUsers = Invoke-Api 'GET' '/auth/v1/admin/users?per_page=1000'
  $remainingUsers = @($verifyUsers.Body.users | Where-Object {
    $_.user_metadata -and $_.user_metadata.PSObject.Properties['run_id'] -and $_.user_metadata.run_id -eq $RunId
  }).Count
  $result = [ordered]@{
    runId = $RunId
    matchedUsers = $users.Count
    deletedTrips = $deletedTrips
    deletedUsers = $deletedUsers
    remainingUsers = $remainingUsers
    failures = @($failures)
    cleanupPass = ($failures.Count -eq 0 -and $remainingUsers -eq 0)
  }
  $result | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $EvidenceFile
  $result | ConvertTo-Json -Depth 5
  if (-not $result.cleanupPass) { exit 1 }
} finally {
  $serviceKey = $null
  $http.Dispose()
}
