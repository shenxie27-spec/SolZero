import os

SITE = r"D:\sol\solzero\deploy\site"
os.makedirs(os.path.join(SITE, "privacy"), exist_ok=True)
os.makedirs(os.path.join(SITE, "terms"), exist_ok=True)

STYLE = """
:root{--bg:#0A1012;--card:#131B1F;--line:#23353B;--text:#EAF9F6;--dim:#9DB5B0;--faint:#5F7672;--accent:#5FD8C8;--gold:#FFC94D}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--text);font-family:-apple-system,'Segoe UI',Roboto,'PingFang SC','Microsoft YaHei',sans-serif;line-height:1.65;min-height:100vh}
a{color:var(--accent);text-decoration:none}
a:hover{text-decoration:underline}
.wrap{max-width:920px;margin:0 auto;padding:48px 24px 64px}
header{display:flex;align-items:center;gap:16px;padding:24px 0;border-bottom:1px solid var(--line)}
header img{width:52px;height:52px;border-radius:14px}
header h1{font-size:22px;letter-spacing:.5px}
header p{color:var(--dim);font-size:14px}
.hero{margin:40px 0 32px}
.hero h2{font-size:34px;line-height:1.25;margin-bottom:14px}
.hero h2 span{color:var(--accent)}
.hero p{color:var(--dim);font-size:17px;max-width:640px}
.btn{display:inline-block;margin-top:22px;background:var(--accent);color:#06281C;font-weight:700;padding:12px 26px;border-radius:12px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px;margin:28px 0}
.card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:20px}
.card h3{font-size:16px;margin-bottom:8px;color:var(--accent)}
.card p{color:var(--dim);font-size:14px}
.meta{margin-top:36px;padding-top:20px;border-top:1px solid var(--line);color:var(--dim);font-size:14px}
footer{color:var(--faint);font-size:13px;text-align:center;padding:24px}
.legal h1{font-size:26px;margin-bottom:6px}
.legal .eff{color:var(--faint);font-size:13px;margin-bottom:28px}
.legal section{margin-bottom:22px}
.legal h2{font-size:18px;color:var(--accent);margin-bottom:8px}
.legal p,.legal li{color:var(--dim);font-size:15px}
.legal ul{padding-left:20px}
.cn{color:var(--gold);font-size:13px;margin-top:8px}
"""

INDEX = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>SolZero — One-Tap Solana Wallet Cleaner</title>
<meta name="description" content="SolZero scans your Solana wallet, closes empty token accounts and burns dust tokens in one tap, reclaiming locked SOL rent while you earn loyalty points.">
<style>{style}</style>
</head>
<body>
<div class="wrap">
<header>
  <img src="/icon.png" alt="SolZero logo">
  <div>
    <h1>SolZero</h1>
    <p>One-Tap Solana Wallet Cleaner</p>
  </div>
</header>

<section class="hero">
  <h2>Turn wallet clutter into <span>recovered SOL</span>.</h2>
  <p>SolZero scans your Solana wallet, closes empty SPL and Token-2022 accounts, and burns dust tokens in a single tap — reclaiming the locked SOL rent while you earn loyalty points.</p>
  <a class="btn" href="#features">Explore features</a>
</section>

<div class="grid" id="features">
  <div class="card"><h3>Smart Scan</h3><p>Automatically finds every zero-balance SPL and Token-2022 account in your wallet.</p></div>
  <div class="card"><h3>One-Tap Batch Close</h3><p>Closes multiple accounts in a single transaction with full preview and per-account selection.</p></div>
  <div class="card"><h3>Dust Burn + Close</h3><p>Burns worthless micro-balances and closes the account in one step, leaving no leftovers.</p></div>
  <div class="card"><h3>Rent Recovery</h3><p>Reclaims the ~0.002 SOL locked in each empty account, minus a transparent 10% service fee.</p></div>
  <div class="card"><h3>Loyalty Points</h3><p>Every $0.10 of recovered value earns 1 point, building your benefits for future rewards.</p></div>
  <div class="card"><h3>Daily Check-In</h3><p>Streak rewards from 1 point on day one up to 7 points per day, reset only when you miss a day.</p></div>
  <div class="card"><h3>Referral Program</h3><p>Invite friends and earn 20% of every Level-1 partner's points and 5% of Level-2.</p></div>
  <div class="card"><h3>Security First</h3><p>Connect via Mobile Wallet Adapter — no private keys, no seed imports. All signing happens on your device.</p></div>
</div>

<section class="meta">
  <a href="/privacy">Privacy Policy</a> &nbsp;·&nbsp; <a href="/terms">Terms of Service</a> &nbsp;·&nbsp; support@solzero.top
</section>
</div>
<footer>© 2026 SolZero · Solana wallet utility</footer>
</body>
</html>
"""

PRIVACY = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Privacy Policy — SolZero</title>
<style>{style}</style>
</head>
<body>
<div class="wrap legal">
<header><div><h1>SolZero</h1><p>One-Tap Solana Wallet Cleaner</p></div></header>

<h1 style="margin-top:32px">Privacy Policy</h1>
<p class="eff">Effective: 2026-08-22</p>

<section>
<h2>1. Data we collect</h2>
<ul>
<li>Wallet public address (for login and on-chain verification).</li>
<li>Business records: points, check-in streak, invite relationships, and transaction signatures of your cleanup/check-in transactions.</li>
<li>We NEVER collect or store private keys or seed phrases. All signing happens inside your device's Seed Vault via Mobile Wallet Adapter.</li>
</ul>
</section>

<section>
<h2>2. How we use it</h2>
<p>To run the points, check-in and invite system; to verify on-chain operations; to prevent abuse.</p>
</section>

<section>
<h2>3. Sharing</h2>
<p>We do not sell your data. Data is processed only by our servers and infrastructure providers (hosting, RPC nodes).</p>
</section>

<section>
<h2>4. Retention &amp; deletion</h2>
<p>You may delete your account at any time (Profile &gt; Delete account). All your personal data is removed immediately.</p>
</section>

<section>
<h2>5. Contact</h2>
<p>support@solzero.top</p>
</section>

<section>
<p class="cn">中文摘要：我们仅收集钱包公钥与业务数据（积分、签到、邀请关系、交易签名），绝不接触私钥或助记词；数据仅用于积分/签到/邀请体系与链上核验；您可在「我的-注销账号」随时删除全部数据。</p>
</section>

<p style="margin-top:24px"><a href="/">← Back to SolZero</a></p>
</div>
<footer>© 2026 SolZero</footer>
</body>
</html>
"""

TERMS = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Terms of Service — SolZero</title>
<style>{style}</style>
</head>
<body>
<div class="wrap legal">
<header><div><h1>SolZero</h1><p>One-Tap Solana Wallet Cleaner</p></div></header>

<h1 style="margin-top:32px">Terms of Service</h1>
<p class="eff">Effective: 2026-08-22</p>

<section>
<h2>1. Service</h2>
<p>SolZero is a wallet-management utility. It scans empty SPL token accounts and dust tokens, lets you close/burn them to reclaim locked SOL rent, and provides check-in, points and invite features.</p>
</section>

<section>
<h2>2. Service fee</h2>
<p>A service fee of <strong>10% of the gross reclaimed amount</strong> is charged automatically and is clearly shown in the confirmation screen before every cleanup. You confirm each transaction with your own wallet.</p>
</section>

<section>
<h2>3. Points</h2>
<ul>
<li>0.1 USD of reclaimed value = 1 point (gross value, computed at the SOL price at the time of operation).</li>
<li>Check-in points follow a 1-7/day streak ladder; a broken streak resets to 1.</li>
<li>Invite bonuses: 20% (level 1) and 5% (level 2) of your partners' cleanup points, granted extra by the platform and never deducted from partners.</li>
<li>Points are NOT cash, cannot be transferred, sold or withdrawn, and rules may be adjusted by the platform. "More member benefits" may be introduced in the future; points do not represent any promise of tokens, airdrops or financial returns.</li>
</ul>
</section>

<section>
<h2>4. Your responsibility</h2>
<ul>
<li>You operate your own assets. Burning tokens is irreversible. Value judgments (e.g. "dust", "worthless") are suggestions only — please review every item before confirming.</li>
<li>SolZero provides no investment advice and does not custody your assets. Keys never leave your device.</li>
</ul>
</section>

<section>
<h2>5. Risk</h2>
<p>Blockchain transactions are final. Please confirm carefully.</p>
</section>

<section>
<h2>6. Deletion</h2>
<p>You may delete your account and all data at any time.</p>
</section>

<section>
<p class="cn">中文摘要：SolZero 为钱包整理工具；每次清理自动收取回收毛值 10% 的服务费并在确认页明示；积分不可转让、无现金价值、规则可调整，不构成任何代币/空投/收益承诺；燃烧不可逆，请逐项确认；私钥始终由您的设备保管。</p>
</section>

<p style="margin-top:24px"><a href="/">← Back to SolZero</a></p>
</div>
<footer>© 2026 SolZero</footer>
</body>
</html>
"""

with open(os.path.join(SITE, "index.html"), "w", encoding="utf-8") as f:
    f.write(INDEX.format(style=STYLE))
with open(os.path.join(SITE, "privacy", "index.html"), "w", encoding="utf-8") as f:
    f.write(PRIVACY.format(style=STYLE))
with open(os.path.join(SITE, "terms", "index.html"), "w", encoding="utf-8") as f:
    f.write(TERMS.format(style=STYLE))
print("site files written")
