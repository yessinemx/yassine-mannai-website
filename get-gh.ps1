[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$ErrorActionPreference = 'Stop'
$tools = Join-Path (Get-Location) 'tools'
New-Item -ItemType Directory -Force -Path $tools | Out-Null
$headers = @{ 'User-Agent' = 'setup-script' }
$rel = Invoke-RestMethod -Uri 'https://api.github.com/repos/cli/cli/releases/latest' -Headers $headers -TimeoutSec 40
$asset = $rel.assets | Where-Object { $_.name -like '*windows_amd64.zip' } | Select-Object -First 1
if (-not $asset) { throw 'no windows_amd64.zip asset found' }
Write-Output ("Downloading " + $asset.name)
$zip = Join-Path $tools $asset.name
Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $zip -Headers $headers -TimeoutSec 120
Expand-Archive -Path $zip -DestinationPath (Join-Path $tools 'gh') -Force
$ghExe = Get-ChildItem -Path (Join-Path $tools 'gh') -Recurse -Filter 'gh.exe' | Select-Object -First 1
Write-Output ("gh.exe at: " + $ghExe.FullName)
& $ghExe.FullName --version
