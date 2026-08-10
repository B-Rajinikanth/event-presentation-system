import { Router } from 'express';
import User from '../models/User.js';
import { requireAuth, requireSuperAdmin } from '../middleware/auth.js';
import { forceLogoutUser } from '../sockets/registry.js';

const router = Router();
router.use(requireAuth, requireSuperAdmin);

// Every mutating action below targets a plain admin account, never another
// superadmin — mirrors the existing delete restriction. Managing a fellow
// superadmin isn't offered here; that stays a manual, deliberate action.
async function loadManageableTarget(req, res) {
  if (req.params.id === req.user.id) {
    res.status(400).json({ message: 'You cannot manage your own account here' });
    return null;
  }
  const target = await User.findById(req.params.id);
  if (!target) {
    res.status(404).json({ message: 'Admin not found' });
    return null;
  }
  if (target.role === 'superadmin') {
    res.status(403).json({ message: 'Super admin accounts cannot be managed here' });
    return null;
  }
  return target;
}

router.get('/', async (req, res, next) => {
  try {
    const users = await User.find({}).sort({ createdAt: -1 });
    res.json({ admins: users.map((u) => u.toSafeJSON()) });
  } catch (err) {
    next(err);
  }
});

// Always creates role: 'admin' — a second superadmin is a rare, higher-
// stakes decision this UI deliberately doesn't offer; that stays a manual
// seed-script action.
router.post('/', async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ message: 'An account with that email already exists' });
    }

    const admin = await User.create({ name, email, password, role: 'admin' });
    res.status(201).json({ admin: admin.toSafeJSON() });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const target = await loadManageableTarget(req, res);
    if (!target) return;

    const targetId = target.id;
    await target.deleteOne();
    forceLogoutUser(targetId, 'Your account was removed by a super admin.');
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Activate/deactivate: a deactivated admin can't log in (auth.routes.js) or
// reconnect to the room (sockets/index.js), and is immediately kicked out
// of any session they currently have open.
router.patch('/:id/status', async (req, res, next) => {
  try {
    const { active } = req.body;
    if (typeof active !== 'boolean') {
      return res.status(400).json({ message: '"active" must be true or false' });
    }

    const target = await loadManageableTarget(req, res);
    if (!target) return;

    target.active = active;
    if (!active) target.tokenVersion += 1;
    await target.save();

    if (!active) {
      forceLogoutUser(target.id, 'Your account has been deactivated by a super admin.');
    }
    res.json({ admin: target.toSafeJSON() });
  } catch (err) {
    next(err);
  }
});

// Superadmin sets a new password directly for the target account (as
// opposed to /auth/change-password, which is self-service and requires
// knowing the current password).
router.post('/:id/reset-password', async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters' });
    }

    const target = await loadManageableTarget(req, res);
    if (!target) return;

    target.password = newPassword;
    target.tokenVersion += 1;
    await target.save();

    forceLogoutUser(target.id, 'A super admin reset your password. Please log in again.');
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Ends the target's current session (if any) without changing their
// password or account status — e.g. to hand control back without a
// password reset.
router.post('/:id/force-logout', async (req, res, next) => {
  try {
    const target = await loadManageableTarget(req, res);
    if (!target) return;

    target.tokenVersion += 1;
    await target.save();

    forceLogoutUser(target.id, 'A super admin ended your session.');
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
