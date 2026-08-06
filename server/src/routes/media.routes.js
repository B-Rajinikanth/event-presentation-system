import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import Media from '../models/Media.js';
import { requireAuth } from '../middleware/auth.js';
import { upload, UPLOADS_DIR } from '../middleware/upload.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.event) filter.event = req.query.event;
    if (req.query.type) filter.type = req.query.type;
    const media = await Media.find(filter).sort({ createdAt: -1 });
    res.json({ media });
  } catch (err) {
    next(err);
  }
});

router.post('/', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    if (!req.body.event) {
      fs.unlink(path.join(UPLOADS_DIR, req.file.filename), () => {});
      return res.status(400).json({ message: 'An event must be selected for this media' });
    }

    const media = await Media.create({
      name: req.body.name || req.file.originalname,
      type: req.body.type || 'poster',
      fileName: req.file.filename,
      url: `/uploads/posters/${req.file.filename}`,
      mimeType: req.file.mimetype,
      size: req.file.size,
      event: req.body.event,
    });

    res.status(201).json({ media });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const media = await Media.findByIdAndUpdate(
      req.params.id,
      { name: req.body.name, type: req.body.type },
      { new: true, runValidators: true }
    );
    if (!media) return res.status(404).json({ message: 'Media not found' });
    res.json({ media });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const media = await Media.findByIdAndDelete(req.params.id);
    if (!media) return res.status(404).json({ message: 'Media not found' });

    const filePath = path.join(UPLOADS_DIR, media.fileName);
    fs.unlink(filePath, (err) => {
      if (err && err.code !== 'ENOENT') console.error('[media] failed to delete file:', err.message);
    });

    res.json({ message: 'Media deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
