$ErrorActionPreference = 'Continue'
$env:PATH = 'C:\Users\PC\AppData\Local\Author Software\nvm\installs\v22.23.2;' + $env:PATH
Set-Location (Resolve-Path (Join-Path $PSScriptRoot '../..'))
$gates = @(
  @{ Name='lint'; Command='npm.cmd'; Arguments=@('run','lint') },
  @{ Name='typecheck'; Command='npm.cmd'; Arguments=@('run','typecheck') },
  @{ Name='jest-full'; Command='npm.cmd'; Arguments=@('test','--','--runInBand') },
  @{ Name='expo-doctor'; Command='npx.cmd'; Arguments=@('expo-doctor') },
  @{ Name='expo-install-check'; Command='npx.cmd'; Arguments=@('expo','install','--check') }
)
foreach ($gate in $gates) {
  $output = & $gate.Command @($gate.Arguments) 2>&1
  $code = $LASTEXITCODE
  $output | Out-File (Join-Path $PSScriptRoot ($gate.Name+'.log')) -Encoding utf8
  "EXIT_CODE=$code" | Out-File (Join-Path $PSScriptRoot ($gate.Name+'.log')) -Append -Encoding utf8
  Write-Output "$($gate.Name): EXIT_CODE=$code"
}
