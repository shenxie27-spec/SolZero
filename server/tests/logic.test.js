import test from 'node:test';
import assert from 'node:assert/strict';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

process.env.DB_PATH = ':memory:';
process.env.JWT_SECRET = 'test-secret';

const points = await import('../src/services/points.js');
const auth = await import('../src/auth.js');
const middleware = await import('../src/middleware.js');
const { db } = await import('../src/db.js');

test('签到阶梯：1-7 封顶', () => {
  assert.equal(points.ladderPoints(1), 1);
  assert.equal(points.ladderPoints(3), 3);
  assert.equal(points.ladderPoints(7), 7);
  assert.equal(points.ladderPoints(10), 7);
  assert.equal(points.ladderPoints(0), 1);
});

test('连续签到：昨天+1，断签重置，当天重复拦截', () => {
  assert.deepEqual(points.computeStreak('2026-08-20', '2026-08-21', 4), { streak: 5, alreadyDone: false });
  assert.deepEqual(points.computeStreak('2026-08-18', '2026-08-21', 7), { streak: 1, alreadyDone: false });
  assert.deepEqual(points.computeStreak('2026-08-21', '2026-08-21', 5), { streak: 5, alreadyDone: true });
  assert.deepEqual(points.computeStreak(null, '2026-08-21', 0), { streak: 1, alreadyDone: false });
});

test('清理积分：0.1 美元 = 1 分，向下取整', () => {
  assert.equal(points.cleanupPointsForUsd(0.1), 1);
  assert.equal(points.cleanupPointsForUsd(0.19), 1);
  assert.equal(points.cleanupPointsForUsd(1.23), 12);
  assert.equal(points.cleanupPointsForUsd(0), 0);
  assert.equal(points.cleanupPointsForUsd(NaN), 0);
});

test('对外积分只保留一位小数', () => {
  const u = middleware.publicUser({
    wallet: 'A',
    code: 'B',
    points: 12.340000000000002,
    streak: 1,
    last_checkin_date: null,
    created_at: '2026-09-05'
  });
  assert.equal(u.points, 12.3);
});

test('错误上报与清理名单数据表已创建', () => {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((r) => r.name);
  assert.ok(tables.includes('cleanup_allowlist'));
  assert.ok(tables.includes('error_reports'));
});

test('邀请返点：L1 20%、L2 5%，向下取整', () => {
  assert.equal(points.referralPoints(12, 0.2), 2);
  assert.equal(points.referralPoints(12, 0.05), 0);
  assert.equal(points.referralPoints(7, 0.2), 1);
  assert.equal(points.referralPoints(20, 0.05), 1);
});

test('SIWS 登录：挑战-签名-验证', () => {
  const kp = nacl.sign.keyPair();
  const wallet = bs58.encode(kp.publicKey);
  const { nonce, message } = auth.createChallenge(wallet);

  const goodSig = bs58.encode(nacl.sign.detached(Buffer.from(message, 'utf8'), kp.secretKey));
  assert.equal(auth.verifyChallenge(wallet, nonce, goodSig), true);

  const { nonce: nonce2 } = auth.createChallenge(wallet);
  assert.throws(() => auth.verifyChallenge(wallet, nonce2, bs58.encode(nacl.sign.detached(Buffer.from('other message'), kp.secretKey))), /signature invalid/);
});

test('邀请绑定：两级关系落库、防重复、防自邀', () => {
  const mk = (wallet, code) => {
    db.prepare('INSERT INTO users (wallet, code) VALUES (?, ?)').run(wallet, code);
    return db.prepare('SELECT * FROM users WHERE wallet = ?').get(wallet);
  };
  const a = mk('Awallet1111111111111111111111111111111111111111', 'AAAA1111');
  const b = mk('Bwallet1111111111111111111111111111111111111111', 'BBBB2222');
  const c = mk('Cwallet1111111111111111111111111111111111111111', 'CCCC3333');

  const r1 = auth.bindInvite(b.id, 'AAAA1111');
  assert.deepEqual(r1, { inviterId: a.id, l2Id: null });

  const r2 = auth.bindInvite(c.id, 'BBBB2222');
  assert.deepEqual(r2, { inviterId: b.id, l2Id: a.id });

  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM referrals WHERE level = 1').get().n, 2);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM referrals WHERE level = 2').get().n, 1);

  assert.equal(auth.bindInvite(c.id, 'AAAA1111'), null);
  assert.equal(auth.bindInvite(a.id, 'BBBB2222'), null);
});
