import { verifyToken } from '../utils/jwt.js';
import User from '../models/User.js';

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Authentication token missing' });
  }

  try {
    const decoded = verifyToken(token);
    // A superadmin action (deactivate/reset password/remove/force-logout)
    // bumps tokenVersion or flips active on the target user — checked here
    // on every request so a stale token stops working immediately, not just
    // once it naturally expires.
    const user = await User.findById(decoded.id).select('active tokenVersion');
    if (!user || !user.active || user.tokenVersion !== decoded.tokenVersion) {
      return res.status(401).json({ message: 'Your session is no longer valid. Please log in again.' });
    }
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

export function requireAdmin(req, res, next) {
  if (!['admin', 'superadmin'].includes(req.user?.role)) {
    return res.status(403).json({ message: 'Admin role required' });
  }
  next();
}

export function requireSuperAdmin(req, res, next) {
  if (req.user?.role !== 'superadmin') {
    return res.status(403).json({ message: 'Super admin role required' });
  }
  next();
}
