const mongoose = require('mongoose');

const resumeFileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
    index: true,
  },
  resumeId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Resume',
  },
  certificationId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  filename: { type: String, required: true, maxlength: 180 },
  contentType: { type: String, enum: ['application/pdf', 'image/jpeg', 'image/png'], required: true },
  data: { type: Buffer, required: true },
}, { timestamps: true });

resumeFileSchema.index({ resumeId: 1, certificationId: 1 }, { unique: true });

module.exports = mongoose.model('ResumeFile', resumeFileSchema);