import { getConnection, parseCheckinMemo, TASK_PREFIX, fetchConfirmedTx } from 'solzero-core';
import { db } from '../db.js';
import { config } from '../config.js';
import { utcDateString } from './points.js';

export const TASK_REWARD = 100;

export async function verifyTaskTx(signature, wallet, today) {
  const connection = getConnection(config.cluster);
  let tx;
  try {
    tx = await fetchConfirmedTx(connection, signature);
  } catch (err) {
    throw Object.assign(new Error('无法读取链上交易，请稍后重试'), { status: 502 });
  }
  if (!tx) throw Object.assign(new Error('交易未确认，请稍后重试'), { status: 404 });
  if (tx.meta && tx.meta.err) throw Object.assign(new Error('该交易在链上执行失败'), { status: 422 });

  const memos = parseCheckinMemo(tx);
  if (!memos.includes(`${TASK_PREFIX}${today}`)) {
    throw Object.assign(new Error('任务内容与日期不匹配'), { status: 422 });
  }

  const message = tx.transaction.message;
  const keys = message.getAccountKeys ? message.getAccountKeys() : message.accountKeys;
  const numRequired = message.header ? message.header.numRequiredSignatures : 1;
  let signedByWallet = false;
  for (let i = 0; i < numRequired; i++) {
    const key = keys.get ? keys.get(i) : keys[i];
    if (key.toBase58() === wallet) {
      signedByWallet = true;
      break;
    }
  }
  if (!signedByWallet) throw Object.assign(new Error('该交易不是由当前钱包签名的'), { status: 422 });
  return true;
}

export function taskStatus(user) {
  const today = utcDateString();
  return {
    date: today,
    cleanupDone: user.last_cleanup_date === today,
    claimed: user.last_task_date === today,
    reward: TASK_REWARD
  };
}

export function claimTask(user, signature, today) {
  if (user.last_cleanup_date !== today) {
    throw Object.assign(new Error('今天还没有完成清理任务'), { status: 422 });
  }
  if (user.last_task_date === today) {
    throw Object.assign(new Error('今天的任务奖励已领取'), { status: 409 });
  }
  const claimed = db.prepare("SELECT id FROM points_ledger WHERE kind = 'task' AND ref_sig = ?").get(signature);
  if (claimed) {
    throw Object.assign(new Error('该任务交易已使用过'), { status: 409 });
  }

  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare('UPDATE users SET last_task_date = ?, points = points + ? WHERE id = ?')
      .run(today, TASK_REWARD, user.id);
    db.prepare("INSERT INTO points_ledger (user_id, kind, amount, ref_sig, note) VALUES (?, 'task', ?, ?, ?)")
      .run(user.id, TASK_REWARD, signature, 'daily cleanup task');
    db.exec('COMMIT');
  } catch (err) {
    try { db.exec('ROLLBACK'); } catch (ignored) { /* already rolled back */ }
    throw err;
  }

  const fresh = db.prepare('SELECT points FROM users WHERE id = ?').get(user.id);
  return { awarded: TASK_REWARD, points: fresh.points, date: today };
}
