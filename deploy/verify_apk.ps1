$tmp = 'D:\sol\solzero\release\_check'
Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $tmp | Out-Null
tar -xf 'D:\sol\solzero\release\SolZero-1.0-arm64-release.apk' -C $tmp 2>$null

$hits = rg -a -o --no-filename 'api\.solzero\.[a-z]+' $tmp\assets 2>$null | Sort-Object -Unique
Write-Output "APK 内域名: $hits"

$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
& $adb shell am force-stop com.solzero.app
& $adb shell monkey -p com.solzero.app -c android.intent.category.LAUNCHER 1 | Out-Null
Start-Sleep -Seconds 6
& $adb shell dumpsys window | Select-String 'mCurrentFocus'
Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
