import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    // Optional override for what's shown on presentation screens; falls back
    // to `name` when empty, so the internal/admin name can stay unchanged.
    displayTitle: { type: String, trim: true, default: '' },
    date: { type: Date },
    venue: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
    logo: { type: String, default: '' },
    poster: { type: String, default: '' },
    startTime: { type: Date },
    endTime: { type: Date },
    isActive: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model('Event', eventSchema);
