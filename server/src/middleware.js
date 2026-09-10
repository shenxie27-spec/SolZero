import { authUserFromToken } from './auth.js';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'unauthorized' });
  const user = authUserFromToken(token);
  if (!user) return res.status(401).json({ error: 'invalid or expired token' });
  req.user = user;
  next();
}

export function handle(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

export function publicUser(u) {
  return {
    wallet: u.wallet,
    code: u.code,
    points: Math.round(Number(u.points) * 10) / 10,
    streak: u.streak,
    lastCheckinDate: u.last_checkin_date,
    createdAt: u.created_at
  };
}
