# SolZero 构建与发布指南

## 1. 本机环境（已按此配置并验证通过）

- Node.js ≥ 20（当前 24.19 ✓）
- Rust / Solana CLI / Anchor（已装 ✓，用于本地测试链）
- **JDK 17**：`C:\Program Files\Eclipse Adoptium\jdk-17.0.20.8-hotspot`（Temurin 17.0.20，清华镜像安装），用户环境变量 `JAVA_HOME` 已设置
- **Android SDK**：`C:\Users\Administrator\AppData\Local\Android\Sdk`（`ANDROID_HOME` / `ANDROID_SDK_ROOT` 已设置）
  - cmdline-tools v22.0（新版用 `android` CLI：`android sdk install <pkg>`）
  - `platforms;android-37.0`（已另复制一份为 `platforms/android-37` 供 Gradle compileSdk=37 使用）
  - `build-tools;37.0.0` + `build-tools;36.0.0`（36 由 Nitro 模块自动安装）
  - `ndk;27.1.12297006`、`platform-tools`（adb）
  - `app/android/local.properties` 已写入 `sdk.dir`
- **下载加速（国内网络直连 Google/Maven 极慢，必配）**：
  - Gradle 发行包走腾讯镜像（已写入 `gradle/wrapper/gradle-wrapper.properties`）
  - Maven 依赖走阿里云镜像（已置于 `app/android/build.gradle` 的 `subprojects` 与 `buildscript` 仓库最前）
- 手机端依赖：`cd app && npm install`


> ⚠️ 依赖变更（npm install / package.json 改动）后，必须先清 Metro 缓存再打包，否则旧代码会残留在 bundle 里导致运行崩溃：
> ```powershell
> node -e "require('fs').rmSync('app/android/app/build/generated/assets/react',{recursive:true,force:true}); require('fs').rmSync('app/node_modules/.cache',{recursive:true,force:true}); require('fs').rmSync(process.env.TEMP + '/metro-cache',{recursive:true,force:true})"
> ```

### 关键原生依赖（必须保留在 app/package.json 的 dependencies 中）

- `react-native-nitro-modules@0.37.0`（Nitro 框架，quick-crypto 运行必需）
- `react-native-quick-base64@3.0.1`（base64 原生加速，quick-crypto 运行必需）
- `@solana-mobile/mobile-wallet-adapter-protocol@2.3.0` 与 `@solana-mobile/mobile-wallet-adapter-protocol-web3js@2.3.0`（MWA 原生模块，缺失时点击“连接钱包”必闪退，必须直接列在 dependencies）
- `overrides` 已把 `@wallet-ui/react-native-web3js` 内部的 async-storage 统一到 3.1.1（多版本会闪退）
- 登录页内置「先逛逛（游客模式）」跳过入口：游客可浏览四个标签页，清理/扫描前会提示先连接钱包

## 1.5 手机联调模式（生产服务器未上线前的临时方案）

- 打开 `app/src/config.js` 的 `USE_LOCAL_API` 开关（当前为 `true`）：App 会把 API 指向电脑本机 `http://127.0.0.1:8787`。
- 正式发布前必须把 `USE_LOCAL_API` 改回 `false`（指向 `https://api.solzero.top`）再打包。
- 已在 `app/android/app/src/main/res/xml/network_security_config.xml` 中仅对 127.0.0.1 / localhost / 10.0.2.2 放行明文 HTTP，生产 HTTPS 不受影响。
- 联调步骤：
  1. 电脑启动后端：`cd server; $env:JWT_SECRET='dev'; node src/index.js`（监听 8787）
  2. 手机 USB 连接后执行：`adb reverse tcp:8787 tcp:8787`
  3. 打包 release 并安装；App 内点「连接种子库钱包」→ 手机弹出钱包授权与签名请求 → 全部允许 → 登录成功（数据写入 `server/data/solzero.db`）
- 注意：此模式下手机必须保持 USB 连接且电脑后端在运行，否则 App 内联网功能会提示「钱包已连接，但登录服务器不可用」。

## 2. 本地开发联调

```powershell
# 1) 起本地测试链（不依赖外网 RPC）
cd core
solana-test-validator --reset --mint <测试钱包地址> --faucet-port 9900

# 2) 起后端（连接本地链）
cd ../server
$env:SOLZERO_CLUSTER="localnet"; $env:SOLZERO_SOL_USD="150"; $env:JWT_SECRET="dev"; node src/index.js

# 3) 真机联调（Seeker 开启 USB 调试）
adb reverse tcp:8787 tcp:8787   # API
adb reverse tcp:8899 tcp:8899   # 本地链 RPC
# app/src/config.js 中 API_URL 开发环境改为 http://127.0.0.1:8787

# 4) 跑应用
cd app && npx react-native run-android
```

## 3. 发布 APK 构建

签名密钥已生成：`D:\keys\solzero-release.keystore`（别名 `solzero`，密码在 `D:\keys\.keystore-password.txt`）。
**请立即把这两个文件备份到安全位置（加密网盘/U 盘）。密钥丢失将无法对商店里的后续版本升级。**

```powershell
$env:JAVA_HOME='C:\Program Files\Eclipse Adoptium\jdk-17.0.20.8-hotspot'
$env:ANDROID_HOME="$env:LOCALAPPDATA\Android\Sdk"
$pw=(Get-Content 'D:\keys\.keystore-password.txt' -Raw).Trim()
cd app/android
.\gradlew.bat assembleRelease -PreactNativeArchitectures=arm64-v8a -x lint "-PSOLZERO_KEYSTORE_FILE=D:/keys/solzero-release.keystore" "-PSOLZERO_KEYSTORE_PASSWORD=$pw" "-PSOLZERO_KEY_ALIAS=solzero" "-PSOLZERO_KEY_PASSWORD=$pw"
```

产物：`app/android/app/build/outputs/apk/release/app-arm64-v8a-release.apk`（当前版本号 1.0 / versionCode 1）

验证签名（应显示 CN=SolZero，且无 application-debuggable）：

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\build-tools\37.0.0\apksigner.bat" verify --print-certs .\app\build\outputs\apk\release\app-arm64-v8a-release.apk
```

Debug 包（真机联调用）：

```powershell
.\gradlew.bat assembleDebug -PreactNativeArchitectures=arm64-v8a -x lint
```

## 3.5 Seeker 真机安装（侧载）

1. Seeker 手机：设置 → 关于手机 → 连点「版本号」7 次开启开发者选项，再打开「USB 调试」
2. USB 连接电脑，执行 `adb devices` 确认设备出现（首次需在手机上点授权）
3. 安装 Release 包：

```powershell
adb install -r app/android/app/build/outputs/apk/release/app-arm64-v8a-release.apk
```

4. 本地链联调时追加端口反向代理：

```powershell
adb reverse tcp:8787 tcp:8787   # API
adb reverse tcp:8899 tcp:8899   # 本地链 RPC
```

5. 生产联调：把 `app/src/config.js` 的 API_URL 指向香港服务器域名后重新打包

## 4. Seeker 商店提交

1. 注册/登录 [publish.solanamobile.com](https://publish.solanamobile.com)（需要 Solana 钱包验证；发布主体选**个人**）
2. 提交 APK + 名称 `SolZero – Solana Wallet Cleaner · Close Empty Accounts & Reclaim SOL` + 图标/截图/描述（描述内嵌四语关键词）
3. 审核约 3-5 个工作日

## 5. 服务器部署（阿里云香港）

见 `deploy/` 目录：

```bash
# 服务器上
git clone <仓库> solzero && cd solzero/deploy
echo "JWT_SECRET=$(openssl rand -hex 32)" > .env
# 域名解析 api.solzero.top -> 服务器 IP
# Caddyfile 中修改域名为实际域名
docker compose up -d --build
```

免费 RPC 获取：到 [helius.dev](https://www.helius.dev) 注册免费档 → Dashboard 创建 API Key → 把 `https://mainnet.helius-rpc.com/?api-key=你的key` 填入下面两个变量（香港服务器可直连）。

生产环境变量（deploy/.env 或 compose）：

- `SOLZERO_MAINNET_RPC` / `SOLZERO_PROXY_UPSTREAM`：主网 RPC（推荐 Helius，香港可达，示例 `https://mainnet.helius-rpc.com/?api-key=你的key`）
- `JWT_SECRET`：随机长字符串
- `SOLZERO_TREASURY`：金库地址（默认已配 B5FhC46zHEcurfhy7mn88jyq7GvTS73qpZ2R9aUVcKJe）

## 6. 代码加固说明

| 层 | 措施 |
| --- | --- |
| JS 层 | Hermes 字节码编译（-O -g0），发布包无明文 JS、无 sourcemap |
| 原生层 | R8 + ProGuard（minify + shrinkResources）、仅 arm64-v8a |
| 架构层 | 密钥、API 密钥、积分/邀请/扣费逻辑全部在服务端，客户端无可窃取机密 |
| 可选升级 | 商用加固壳（DexGuard / 爱加密 / 腾讯乐固），需在上架前评估兼容性 |

> 提示：任何客户端加固都只能提高门槛。真正安全依赖「客户端零机密 + 服务端核验」。
