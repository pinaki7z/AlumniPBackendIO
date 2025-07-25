// models/newsSchema.js  
const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  authorId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Alumni', required: true },
  authorName:  { type: String, required: true },
  authorEmail: { type: String },
  text:        { type: String, required: true, trim: true },
  parent:      { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },
  createdAt:   { type: Date, default: Date.now }
});

const newsSchema = new mongoose.Schema({
  title:              { type: String, required: true, trim: true },
  subtitle:           { type: String, trim: true },
  category:           { 
    type: String, 
    required: true,
    enum: ['achievements', 'events', 'careers', 'academics', 'alumni-spotlight', 'research', 'announcements', 'community']
  },
  content:            { type: String, required: true },
  metaDescription:    { type: String, required: true, maxlength: 160 },
  featuredImage:      { type: String },
  additionalImages:   [{ type: String }],
  tags:              [{ type: String }],
  priority:          { 
    type: String, 
    enum: ['low', 'medium', 'high'], 
    default: 'medium' 
  },
  status:            { 
    type: String, 
    enum: ['draft', 'published', 'archived'], 
    default: 'draft' 
  },
  
  // Author Information
  authorId:          { type: mongoose.Schema.Types.ObjectId, ref: 'Alumni', required: true },
  authorName:        { type: String, required: true },
  authorEmail:       { type: String, required: true },
  
  // External Links
  externalLinks:     [{
    title: { type: String, trim: true },
    url:   { type: String, trim: true }
  }],
  
  // Engagement Metrics
  views:             { type: Number, default: 0 },
  likes:             { type: Number, default: 0 },
  likedBy:          [{ type: mongoose.Schema.Types.ObjectId, ref: 'Alumni' }],
  comments:          [commentSchema],
  shares:            { type: Number, default: 0 },
  
  // SEO & Analytics
  readTime:          { type: String },
  targetAudience:    { type: String },
  
  // Additional Fields
  authorNote:        { type: String },
  
  // Timestamps
  createdAt:         { type: Date, default: Date.now },
  publishedAt:       { type: Date },
  updatedAt:         { type: Date, default: Date.now }
});

// Update the updatedAt field before saving
newsSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Set publishedAt when status changes to published
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = Date.now();
  }
  
  next();
});

// Index for better query performance
newsSchema.index({ status: 1, createdAt: -1 });
newsSchema.index({ category: 1, status: 1 });
newsSchema.index({ authorId: 1 });
newsSchema.index({ tags: 1 });

module.exports = mongoose.model('Newsv2', newsSchema);
