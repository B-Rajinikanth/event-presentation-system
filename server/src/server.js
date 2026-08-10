import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';

import { connectDB } from './config/db.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import { initSocket } from './sockets/index.js';

import authRoutes from './routes/auth.routes.js';
import eventRoutes from './routes/event.routes.js';
import mediaRoutes from './routes/media.routes.js';
import presentationRoutes from './routes/presentation.routes.js';
import otpRoutes from './routes/otp.routes.js';
import adminsRoutes from './routes/admins.routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
// Render (and most hosts) put the app behind a reverse proxy — without this,
// req.ip resolves to the proxy's address for every request, which would
// collapse the OTP rate-limiter's per-IP buckets into one shared bucket.
app.set('trust proxy', 1);
const server = http.createServer(app);

// Reflect the request origin instead of a fixed one: the Live Camera page is
// meant to be opened from phones/tablets on the venue LAN (e.g.
// http://192.168.x.x:5173), which won't match a single hardcoded origin.
// Auth uses a Bearer token (no cookies), so reflecting the origin carries no
// CSRF/credential risk here.
const io = new Server(server, {
  cors: { origin: true },
});

app.use(cors({ origin: true }));
app.use(express.json({ limit: '5mb' }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/presentation', presentationRoutes);
app.use('/api/otp', otpRoutes);
app.use('/api/admins', adminsRoutes);

app.use(notFound);
app.use(errorHandler);

initSocket(io);

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`[server] Listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('[server] Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });
