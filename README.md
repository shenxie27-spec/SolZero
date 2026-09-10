# SolZero — Solana 钱包清理工具（Seeker dApp Store 专属）

以「关闭空代币账户回收租金」为核心的移动端工具，配套签到、忠诚度积分与两级邀请体系。

- 商店：Solana Seeker dApp Store（APK 上架，商店 0 抽成）
- 收费：回收毛值的 10%（自动转入项目金库）
- 积分：每回收 $0.10 = 1 分（按回收毛值、操作时 SOL 价格折算）
- 邀请：L1 返点 20%、L2 返点 5%（仅按下级「清理积分」计，由项目方额外发放）
- 签到：链上签到（Memo 程序，用户自付正常 gas），阶梯 1→7 分/天，断签重置

详细规则与决策记录见 `docs/PRD.md`。

## 目录

- `core/` — Solana 核心引擎（扫描、打包交易、链上核验），Node 与 React Native 共用
- `server/` — 后端 API（登录、签到、积分、邀请、清理核验）
- `app/` — React Native 手机应用（Seeker Seed Vault 钱包接入）
- `deploy/` — 阿里云香港部署文件（Docker + Caddy）
- `docs/` — PRD、商店政策摘要、法律文本

## 快速开始（开发）

```bash
# 依赖安装
npm install                # 根（core + server workspaces）
cd app && npm install      # 手机应用

# 本地测试链（开发机无法直连外网 RPC 时使用）
cd core
solana-test-validator --reset --mint <你的测试钱包地址> --faucet-port 9900

# 后端
cd server
npm run dev                # 默认 http://localhost:8787

# 全链路冒烟测试（登录/签到/清理/扣费/邀请返点）
# 先以 SOLZERO_CLUSTER=localnet 启动后端，再执行：
cd server
node scripts/smoke.js

# 核心引擎 devnet 演示
cd core
node scripts/devnet-demo.js
```

## 客户端错误收集

- 客户端会自动把登录、清理、签到、任务等环节的错误上报到 `POST /api/errors`，服务端记录 IP、错误信息、堆栈、钱包、平台和版本。
- 查看错误列表：设置环境变量 `SOLZERO_ADMIN_TOKEN` 后，请求 `GET /api/admin/errors?limit=100`，并带请求头 `Authorization: Bearer <SOLZERO_ADMIN_TOKEN>`。
- 每个 IP 每分钟最多上报 30 条，防止接口被刷。
