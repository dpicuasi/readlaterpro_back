const mongoose = require('mongoose');

const collectionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'El nombre de la colección es requerido'],
      trim: true,
      maxlength: [60, 'El nombre no puede superar 60 caracteres'],
    },
    description: {
      type: String,
      trim: true,
      default: null,
    },
    color: {
      type: String,
      default: '#185FA5',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

collectionSchema.virtual('linkCount', {
  ref: 'Link',
  localField: '_id',
  foreignField: 'collectionId',
  count: true,
});

module.exports = mongoose.model('Collection', collectionSchema);
