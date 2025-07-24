// models/sponsorshipSchema.js
const mongoose = require('mongoose');

const sponsorshipSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  detailedDescription: { type: String },
  category: { type: String, required: true },
  sponsorshipType: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  duration: { type: String },
  
  // Sponsor Information
  sponsorName: { type: String, required: true },
  sponsorEmail: { type: String, required: true },
  sponsorPhone: { type: String },
  sponsorWebsite: { type: String },
  sponsorLogo: { type: String },
  
  // Owner tracking
  ownerEmail: { type: String, required: true },
  createdBy: { type: String, required: true },
  
  // Event/Project Information
  eventName: { type: String },
  eventDate: { type: Date },
  eventLocation: { type: String },
  expectedAudience: { type: Number },
  targetDemographic: { type: String },
  
  // Benefits and Deliverables
  benefits: [{ type: String }],
  deliverables: [{ type: String }],
  marketingReach: { type: String },
  
  // Media and Documents
  images: [{ type: String }],
  documents: [{ type: String }],
  proposalDocument: { type: String },
  
  // Status and Verification
  status: { 
    type: String, 
    enum: ['draft', 'pending', 'verified', 'rejected', 'completed', 'cancelled'], 
    default: 'pending' 
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending'
  },
  verifiedBy: { type: String },
  verificationDate: { type: Date },
  rejectionReason: { type: String },
  
  priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
  tags: [{ type: String }],
  
  // Metrics
  views: { type: Number, default: 0 },
  inquiries: { type: Number, default: 0 },
  applications: { type: Number, default: 0 },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date }
});

// Index for better query performance
sponsorshipSchema.index({ verificationStatus: 1, createdAt: -1 });
sponsorshipSchema.index({ ownerEmail: 1 });
sponsorshipSchema.index({ category: 1 });

module.exports = mongoose.model('SponsorshipConnect', sponsorshipSchema);
