import 'dotenv/config';
import { connectDB } from './config/db.js';
import User from './models/User.js';
import mongoose from 'mongoose';

async function seed() {
  await connectDB();

  const email = process.env.ADMIN_EMAIL || 'admin@example.com';
  const password = process.env.ADMIN_PASSWORD || 'Admin@12345';

  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`[seed] Admin user already exists: ${email}`);
  } else {
    const admin = await User.create({ name: 'Event Admin', email, password, role: 'admin' });
    console.log(`[seed] Created admin user: ${admin.email}`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('[seed] Failed:', err);
  process.exit(1);
});
