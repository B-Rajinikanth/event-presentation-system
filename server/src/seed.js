import 'dotenv/config';
import { connectDB } from './config/db.js';
import User from './models/User.js';
import mongoose from 'mongoose';

async function seedUser({ name, email, password, role }) {
  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`[seed] ${role} user already exists: ${email}`);
  } else {
    const user = await User.create({ name, email, password, role });
    console.log(`[seed] Created ${role} user: ${user.email}`);
  }
}

async function seed() {
  await connectDB();

  await seedUser({
    name: 'Event Admin',
    email: process.env.ADMIN_EMAIL || 'admin@example.com',
    password: process.env.ADMIN_PASSWORD || 'Admin@12345',
    role: 'admin',
  });

  await seedUser({
    name: process.env.SUPERADMIN_NAME || 'Rajinikanth B',
    email: process.env.SUPERADMIN_EMAIL || 'rajinikanth.b@suh.edu.in',
    password: process.env.SUPERADMIN_PASSWORD || 'Heyaansh@143',
    role: 'superadmin',
  });

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('[seed] Failed:', err);
  process.exit(1);
});
