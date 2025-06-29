import mongoose from 'mongoose';

const logSchema = new mongoose.Schema({
  level: {
    type: String,
    enum: ['info', 'warning', 'error'],
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  service: {
    type: String,
  },
  meta: {
    type: mongoose.Schema.Types.Mixed,
  },
});

export const Log = mongoose.model('Log', logSchema);
