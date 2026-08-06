import { Router } from 'express';
import { getState } from '../sockets/presentationState.js';

const router = Router();

// Public (no auth) so the unauthenticated /display screen can fetch initial state on load.
router.get('/state', async (req, res, next) => {
  try {
    const state = await getState();
    res.json({ state });
  } catch (err) {
    next(err);
  }
});

export default router;
