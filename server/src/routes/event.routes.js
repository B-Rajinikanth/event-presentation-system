import { Router } from 'express';
import Event from '../models/Event.js';
import SubEvent from '../models/SubEvent.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// ---- Events ----

router.get('/', async (req, res, next) => {
  try {
    const events = await Event.find().sort({ createdAt: -1 });
    res.json({ events });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    const subEvents = await SubEvent.find({ event: event._id }).sort({ order: 1, createdAt: 1 });
    res.json({ event, subEvents });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const event = await Event.create(req.body);
    res.status(201).json({ event });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const event = await Event.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json({ event });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    await SubEvent.deleteMany({ event: event._id });
    res.json({ message: 'Event deleted' });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/activate', async (req, res, next) => {
  try {
    await Event.updateMany({}, { isActive: false });
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      { isActive: true },
      { new: true }
    );
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json({ event });
  } catch (err) {
    next(err);
  }
});

// ---- Sub-events ----

router.get('/:id/sub-events', async (req, res, next) => {
  try {
    const subEvents = await SubEvent.find({ event: req.params.id }).sort({ order: 1, createdAt: 1 });
    res.json({ subEvents });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/sub-events', async (req, res, next) => {
  try {
    const subEvent = await SubEvent.create({ ...req.body, event: req.params.id });
    res.status(201).json({ subEvent });
  } catch (err) {
    next(err);
  }
});

router.put('/:id/sub-events/:subEventId', async (req, res, next) => {
  try {
    const subEvent = await SubEvent.findOneAndUpdate(
      { _id: req.params.subEventId, event: req.params.id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!subEvent) return res.status(404).json({ message: 'Sub-event not found' });
    res.json({ subEvent });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id/sub-events/:subEventId', async (req, res, next) => {
  try {
    const subEvent = await SubEvent.findOneAndDelete({
      _id: req.params.subEventId,
      event: req.params.id,
    });
    if (!subEvent) return res.status(404).json({ message: 'Sub-event not found' });
    res.json({ message: 'Sub-event deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
