// models/prohibitedKeywordsSchema.js
const mongoose = require('mongoose');

const prohibitedKeywordSchema = new mongoose.Schema({
  keyword: {
    type: String,
    required: true,
    trim: true,
    lowercase: true, // Store keywords in lowercase for consistent filtering
    unique: true
  },
  category: {
    type: String,
    enum: ['profanity', 'hate_speech', 'spam', 'inappropriate', 'other'],
    default: 'other'
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  addedBy: {
    type: String,
    required: true // Admin email who added this keyword
  },
  description: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster searches
prohibitedKeywordSchema.index({ keyword: 1 });
prohibitedKeywordSchema.index({ category: 1 });
prohibitedKeywordSchema.index({ isActive: 1 });

// Update the updatedAt field before saving
prohibitedKeywordSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('ProhibitedKeyword', prohibitedKeywordSchema);
