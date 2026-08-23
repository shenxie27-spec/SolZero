$ErrorActionPreference = 'Stop'
$env:JAVA_HOME = 'C:\Program Files\Eclipse Adoptium\jdk-17.0.20.8-hotspot'
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$pw = (Get-Content 'D:\keys\.keystore-password.txt' -Raw).Trim()
if (-not $pw) { throw 'keystore password file is empty' }

Remove-Item 'D:\sol\solzero\app\android\app\build\generated\assets\react' -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item 'D:\sol\solzero\app\node_modules\.cache' -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "$env:TEMP\metro-cache" -Recurse -Force -ErrorAction SilentlyContinue

Write-Output 'cleaned caches, building...'
Set-Location 'D:\sol\solzero\app\android'
& .\gradlew.bat assembleRelease `
    -PreactNativeArchitectures=arm64-v8a `
    -x lint `
    "-PSOLZERO_KEYSTORE_FILE=D:/keys/solzero-release.keystore" `
    "-PSOLZERO_KEYSTORE_PASSWORD=$pw" `
    "-PSOLZERO_KEY_ALIAS=solzero" `
    "-PSOLZERO_KEY_PASSWORD=$pw"
exit $LASTEXITCODE
