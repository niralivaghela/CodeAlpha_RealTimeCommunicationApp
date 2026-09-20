const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema({
  meetingId: {
    type: String,
    required: [true, 'Meeting ID is required'],
    unique: true,
    uppercase: true,
    trim: true,
    index: true,
  },
  hostId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  title: {
    type: String,
    default: 'Instant Meeting',
    trim: true,
  },
  scheduledFor: {
    type: Date,
    default: null,
  },
  durationMinutes: {
    type: Number,
    default: 45,
  },
  options: {
    allowBeforeHost: { type: Boolean, default: true },
    requireAuth: { type: Boolean, default: true },
    muteOnEntry: { type: Boolean, default: false },
    cameraOffOnEntry: { type: Boolean, default: false },
    waitingRoom: { type: Boolean, default: false },
  },
  isLocked: {
    type: Boolean,
    default: false,
  },
  waitingRoomQueue: [
    {
      socketId: { type: String },
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      name: { type: String, trim: true },
      email: { type: String, trim: true },
      requestedAt: { type: Date, default: Date.now },
      status: { type: String, enum: ['waiting', 'admitted', 'rejected'], default: 'waiting' },
    },
  ],
  notes: {
    content: { type: String, default: '' },
    updatedAt: { type: Date, default: Date.now },
    updatedByName: { type: String, default: '' },
  },
  polls: [
    {
      pollId: { type: String, required: true },
      question: { type: String, required: true },
      options: [
        {
          id: { type: String, required: true },
          text: { type: String, required: true },
          votes: [{ type: String }], // user ids or socket names
        },
      ],
      creatorName: { type: String, default: '' },
      createdAt: { type: Date, default: Date.now },
      status: { type: String, enum: ['active', 'closed'], default: 'active' },
    },
  ],
  qna: [
    {
      questionId: { type: String, required: true },
      userId: { type: String, default: '' },
      userName: { type: String, default: 'Anonymous' },
      question: { type: String, required: true },
      upvotes: [{ type: String }], // array of userIds
      answered: { type: Boolean, default: false },
      createdAt: { type: Date, default: Date.now },
    },
  ],
  invitations: [
    {
      email: { type: String, trim: true, lowercase: true },
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' },
      sentAt: { type: Date, default: Date.now },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  startedAt: {
    type: Date,
    default: Date.now,
  },
  endedAt: {
    type: Date,
    default: null,
  },
  durationSeconds: {
    type: Number,
    default: 0,
  },
  participants: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      name: {
        type: String,
        trim: true,
      },
      email: {
        type: String,
        trim: true,
      },
      joinedAt: {
        type: Date,
        default: Date.now,
      },
      leftAt: {
        type: Date,
        default: null,
      },
    },
  ],
  status: {
    type: String,
    enum: ['active', 'ended'],
    default: 'active',
  }
});

module.exports = mongoose.model('Meeting', meetingSchema);
