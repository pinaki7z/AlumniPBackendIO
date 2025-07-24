// models/sponsorshipSchema.js
const mongoose = require('mongoose');

const sponsorshipSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  detailedDescription: { type: String },
  category: { type: String, required: true }, // 'Event', 'Product', 'Service', 'Content', 'Community'
  sponsorshipType: { type: String, required: true }, // 'Title', 'Presenting', 'Supporting', 'Media', 'Venue'
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  duration: { type: String }, // '1 month', '3 months', '6 months', '1 year'
  
  // Sponsor Information
  sponsorName: { type: String, required: true },
  sponsorEmail: { type: String, required: true },
  sponsorPhone: { type: String },
  sponsorWebsite: { type: String },
  sponsorLogo: { type: String },
  
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
  
  // Status and Engagement
  status: { type: String, enum: ['active', 'pending', 'completed', 'cancelled'], default: 'pending' },
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

module.exports = mongoose.model('Sponsorshipv2Connect', sponsorshipSchema);
