const mongoose = require('mongoose');

const linkSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    url: {
      type: String,
      required: [true, 'La URL es requerida'],
      trim: true,
    },
    title: {
      type: String,
      trim: true,
      default: null,
    },
    summary: {
      type: String,
      trim: true,
      default: null,
    },
    imageUrl: {
      type: String,
      default: null,
    },
    domain: {
      type: String,
      trim: true,
      default: null,
    },
    favicon: {
      type: String,
      default: null,
    },
    sourceType: {
      type: String,
      enum: ['github', 'twitter', 'youtube', 'web', 'reddit', 'medium', 'other'],
      default: 'other',
    },
    tags: {
      type: [String],
      default: [],
    },
    isFavorite: {
      type: Boolean,
      default: false,
      index: true,
    },
    estimatedReadTime: {
      type: Number,
      default: null,
      min: 1,
    },
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['pending', 'read'],
      default: 'pending',
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      default: null,
    },
    processingStatus: {
      type: String,
      enum: ['pending', 'processing', 'done', 'error'],
      default: 'pending',
    },
    processingError: {
      type: String,
      default: null,
    },
    collectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Collection',
      default: null,
    },
    aiSummary: {
      content: { type: String, default: null },
      keyPoints: {
        type: [
          {
            title: { type: String },
            points: { type: [String] },
          },
        ],
        default: [],
      },
      generatedAt: { type: Date, default: null },
    },
  },
  {
    timestamps: true,
  }
);

linkSchema.index({ userId: 1, status: 1 });
linkSchema.index({ userId: 1, sourceType: 1 });
linkSchema.index({ userId: 1, priority: 1 });
linkSchema.index({ userId: 1, createdAt: -1 });
linkSchema.index({ userId: 1, tags: 1 });
linkSchema.index({ userId: 1, collectionId: 1 });
linkSchema.index({ userId: 1, isFavorite: 1 }, { sparse: true });
linkSchema.index({ title: 'text', summary: 'text', notes: 'text', url: 'text' });

module.exports = mongoose.model('Link', linkSchema);
