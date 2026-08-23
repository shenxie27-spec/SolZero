$ErrorActionPreference = 'Stop'
$env:JAVA_HOME = 'C:\Program Files\Eclipse Adoptium\jdk-17.0.20.8-hotspot'
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"

Remove-Item 'D:\sol\solzero\app\android\app\build\generated\assets\react' -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item 'D:\sol\solzero\app\node_modules\.cache' -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "$env:TEMP\metro-cache" -Recurse -Force -ErrorAction SilentlyContinue

Write-Output 'building debug...'
Set-Location 'D:\sol\solzero\app\android'
& .\gradlew.bat assembleDebug -PreactNativeArchitectures=arm64-v8a -x lint
exit $LASTEXITCODE
