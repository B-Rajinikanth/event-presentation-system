import mongoose from 'mongoose';

const subEventSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    title: { type: String, required: true, trim: true },
    // Optional override for what's shown on presentation screens; falls back
    // to `title` when empty.
    displayTitle: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
    order: { type: Number, default: 0 },
    startTime: { type: Date },
    endTime: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model('SubEvent', subEventSchema);
