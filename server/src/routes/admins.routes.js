import { Router } from 'express';
import User from '../models/User.js';
import { requireAuth, requireSuperAdmin } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth, requireSuperAdmin);

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
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }

    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ message: 'Admin not found' });
    if (target.role === 'superadmin') {
      return res.status(403).json({ message: 'Super admin accounts cannot be deleted here' });
    }

    await target.deleteOne();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
