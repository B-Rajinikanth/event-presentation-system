import mongoose from 'mongoose';

const presentationStateSchema = new mongoose.Schema(
  {
    singletonKey: { type: String, default: 'main', unique: true },

    layout: {
      type: String,
      enum: ['idle', 'poster', 'countdown', 'countdown_live', 'live', 'poster_unveil'],
      default: 'idle',
    },

    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
    activeSubEvent: { type: mongoose.Schema.Types.ObjectId, ref: 'SubEvent' },

    activePoster: { type: mongoose.Schema.Types.ObjectId, ref: 'Media' },

    // A separate, seconds-only countdown for "Poster Unveil" — kept
    // independent from the main event `countdown` below so starting an
    // unveil never clobbers (or gets clobbered by) the main countdown.
    // When it hits zero the server auto-switches layout to 'poster' and
    // broadcasts a one-off 'poster:unveiled' event for the celebration.
    posterUnveilCountdown: {
      durationSeconds: { type: Number, default: 10 },
      remainingSeconds: { type: Number, default: 0 },
      status: { type: String, enum: ['stopped', 'running'], default: 'stopped' },
    },

    countdown: {
      durationSeconds: { type: Number, default: 0 },
      remainingSeconds: { type: Number, default: 0 },
      status: { type: String, enum: ['stopped', 'running', 'paused'], default: 'stopped' },
      startedAt: { type: Date },
      // Screens switch to the red "urgent" alert state at or below this many
      // seconds remaining. Admin-configurable, defaults to 10.
      alertThresholdSeconds: { type: Number, default: 10 },
    },

    live: {
      isLive: { type: Boolean, default: false },
      cameraLabel: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

export default mongoose.model('PresentationState', presentationStateSchema);
