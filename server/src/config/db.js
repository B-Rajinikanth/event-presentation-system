import mongoose from 'mongoose';

export async function connectDB() {
  const uri = process.env.MONGO_URI;
  mongoose.connection.on('connected', () => {
    console.log('[db] MongoDB connected');
  });
  mongoose.connection.on('error', (err) => {
    console.error('[db] MongoDB connection error:', err.message);
  });
  await mongoose.connect(uri);
}
