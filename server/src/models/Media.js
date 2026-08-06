import mongoose from 'mongoose';

const mediaSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['poster', 'banner', 'sponsor', 'welcome', 'guest', 'schedule', 'other'],
      default: 'poster',
    },
    fileName: { type: String, required: true },
    url: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  },
  { timestamps: true }
);

export default mongoose.model('Media', mediaSchema);
