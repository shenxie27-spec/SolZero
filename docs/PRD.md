# SolZero 产品需求文档（PRD）

> 版本 v1.0 · 2026-08-22 · 本文档记录所有已确认的产品决策，后续开发以此为准。

## 1. 产品定位

- 名称：**SolZero**（商店标题：`SolZero – Solana Wallet Cleaner · Close Empty Accounts & Reclaim SOL`）
- 平台：Solana Seeker dApp Store 专属（Android APK）
- 形态：原生质感手机应用（React Native），非网页版
- 语言：简体中文、英语、日语、韩语
- 竞品现状：SolSweep / SolReclaim / Sol Incinerator / Solchekers / Tibane / Burn & Claim 等已存在。差异化 = 积分忠诚度体系 + 四国语言 + 移动原生体验 + 签到裂变。

## 2. 商业模式

- **服务费**：回收毛值的 **10%**（当前仅针对空账户/粉尘清理；未来新增服务再另行定价），在预览页明示，交易内自动转入金库。
- **金库地址**：`B5FhC46zHEcurfhy7mn88jyq7GvTS73qpZ2R9aUVcKJe`（用户提供）
- 商店本身 0 抽成（Solana Mobile 现行政策）。

## 3. 积分体系（忠诚度）

- **赚取**：每回收价值 **$0.10 = 1 分**（按回收**毛值**、操作时 SOL/USD 价格折算，向下取整）。
- 积分存储在**服务器数据库（链下）**；未来若发空投/发币，做快照作为依据。
- 积分**不可转让、不可交易、无现金价值**，规则由项目方调整——写入用户条款。
- **文案口径**：只说「更多会员权益即将解锁」，绝不出现「空投、发币、分红」承诺（商店政策：禁止误导性内容；法律层面规避证券定性）。

## 4. 签到（链上）

- 用户通过应用发起一笔 **Memo 程序**链上交易（自己付正常 gas，约 0.000005 SOL），内容格式：`SOLZERO|CHECKIN|<UTC日期>`。
- 服务器按交易签名 + 区块时间核验，同一钱包同一 UTC 日仅计一次。
- **阶梯**：第 1 天 1 分，第 2 天 2 分，……第 7 天 7 分；连续不断签则此后每天 7 分；断签从 1 分重新开始。
- 签到积分**不参与**邀请返点（防刷）。

## 5. 邀请体系

- 每个用户注册后自动获得唯一邀请码；新用户注册时可填写邀请码（仅限注册时绑定）。
- 两级返点（由项目方额外发放，**不从下级扣**）：
  - 一级伙伴（L1）：其「清理积分」的 **20%** 返给上级
  - 二级伙伴（L2）：其「清理积分」的 **5%** 返给上上级
- 签到积分不参与返点。返点向下取整。

## 6. 功能范围

### MVP（当前阶段）
1. 空 SPL 代币账户扫描（Token + Token-2022）与批量关闭，回收每账户约 0.00203928 SOL 租金
2. 粉尘代币「燃烧 + 关闭」一键处理（价值 < $1 或无法交易）
3. 预览确认：回收总额、10% 服务费、预计到账、预计积分，用户勾选后执行
4. 链上签到（阶梯积分）
5. 忠诚度积分、两级邀请（20% / 5%）
6. 钱包登录（SIWS）、四语言界面
7. 登录页游客模式（可跳过登录先浏览，清理前提示连接钱包）

### 后续阶段（不在本期）
- 垃圾 NFT / cNFT 清理（走 Helius DAS + Bubblegum）
- .sol 域名关闭（Bonfida，关闭前需估值提示）
- 垃圾代币智能识别（rugcheck.xyz 等，阈值筛选）
- 权限撤销（Revoke）、内置 Swap（Jupiter）
- 多钱包批量、程序 buffer、质押提取、DeFi 奖励、LP 清理

## 7. 技术架构

- **手机端**：React Native（Node 24 已就绪）+ Solana Mobile 官方 MWA 库（`@wallet-ui/react-native-web3js`）
  - 钱包：**仅** Seed Vault 种子库钱包（MWA 协议），**绝不导入/接触私钥**
- **核心引擎** `core/`：@solana/web3.js + @solana/spl-token，Server 与 App 共用（扫描、打包、核验）
- **后端** `server/`：Node 24 + Express + 内置 node:sqlite（MVP，可平滑迁移 Postgres）
  - 认证：SIWS（Sign-In With Solana）+ JWT
  - 所有积分/邀请/扣费核验在服务端完成；清理积分通过解析链上交易核验，防伪造
- **RPC**：MVP 用免费节点（Helius 免费档 / 公共 RPC），后续按量升级付费
- **价格**：Jupiter Price API（SOL/USD）
- **部署**：阿里云**香港**（免备案、四国访问快），Docker Compose + Caddy 自动 HTTPS

## 8. 代码加固（防解包）

- Hermes 字节码编译（JS 不落地为明文）
- Android R8/ProGuard 开启
- 发布包移除 sourcemap / 调试符号
- 仅保留 arm64-v8a ABI（Seeker 为 64 位）
- 客户端零机密：API 密钥、金库私钥、商业逻辑全部在服务端
- 后续可选：商用加固壳（DexGuard / 爱加密 等）

## 9. 合规清单（商店审核必需）

- [x] 隐私政策 + 用户协议（已写入 `docs/legal/`，含数据说明、删号功能、积分规则）
- [x] 不收集私钥/助记词；最小化数据收集（仅钱包公钥 + 业务数据）
- [x] 10% 服务费在操作预览与协议中明示
- [x] 无不实承诺（未来福利仅表述为「会员权益」）
- [x] 用户可删除账号及其数据（DELETE /account 接口，已实现并有测试）

## 10. 待办事项（非阻塞）

- [x] 商店发布者账号主体信息：**个人**（已确认）
- [x] 域名购买：`solzero.top`（阿里云，解析 `api` -> 服务器 IP）
- [ ] 阿里云香港服务器购买与部署（由用户操作；部署文件已就绪见 `deploy/`）
- [ ] RPC：上线先用 **Helius 免费档**（`SOLZERO_MAINNET_RPC` / `SOLZERO_PROXY_UPSTREAM`），按量增长后再升级付费
- [ ] Seeker 真机测试：APK 已构建并签名（`app-arm64-v8a-release.apk`：Hermes 字节码、R8、无 sourcemap、仅 arm64、V2 签名），待真机安装联调
- [ ] 商店提交（审核约 3-5 个工作日）

## 11. 开发环境说明（重要）

- 本机网络（中国大陆）无法直连 Solana 官方 RPC / Jupiter 价格接口，开发测试使用**本地测试链**（`solana-test-validator --reset --mint <钱包地址>`），价格通过环境变量 `SOLZERO_SOL_USD` 注入。
- 生产环境（阿里云香港）可直连主网 RPC（Helius/官方），价格走 Jupiter。
- 具体步骤见 `docs/BUILD.md`。

## 12. 风险提示

- Token-2022 账户带扩展（如 transfer hook、permanent delegate）时可能无法直接关闭/燃烧，需逐个容错并提示用户。
- 批量交易受单笔交易体积限制（约 1232 字节），需自动拆分为多笔并按笔确认。
- 部分账号持有超出租金的 lamports，回收额以链上实际为准。
