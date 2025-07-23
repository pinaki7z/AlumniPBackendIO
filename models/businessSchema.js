// models/businessSchema.js
const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  authorId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Alumni', required: true },
  authorName:  { type: String, required: true },
  authorEmail: { type: String },
  text:        { type: String, required: true, trim: true },
  parent:      { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },
  createdAt:   { type: Date, default: Date.now }
});


const businessSchema = new mongoose.Schema({
  businessName:         { type: String, required: true, trim: true },
  industry:             { type: String, required: true },
  description:          { type: String, required: true },
  detailedDescription:  { type: String },
  targetMarket:         { type: String },
  investmentAmount:     { type: Number, default: 0 },
  currentRevenue:       { type: Number, default: 0 },
  fundingGoal:          { type: Number, default: 0 },
  fundingRaised:        { type: Number, default: 0 },
  competitiveAdvantage: { type: String },
  teamExperience:       { type: String },
  marketingStrategy:    { type: String },
  ownerName:            { type: String, required: true },
  ownerEmail:           { type: String },
  ownerPhone:           { type: String },
  website:              { type: String },
  location:             { type: String },
  foundedDate:          { type: Date },
  employeeCount:        { type: Number, default: 0 },
  backgroundImage:      { type: String },
  logo:                 { type: String },
  businessPlan:         { type: String },
  status:               { type: String, enum: ['pending','verified','rejected'], default: 'pending' },
  likes:                { type: Number, default: 0 },
  likedBy:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'Alumni' }],   // NEW
  comments:   [commentSchema],  
  shares:               { type: Number, default: 0 },
  businessModel:        { type: String },
  revenueStreams:       [{ type: String }],
  marketSize:           { type: String },
  customerBase:         { type: String },
  keyMetrics: {
    monthlyGrowth:         Number,
    customerRetention:     Number,
    averageRevenuePerUser: Number,
    timeToBreakeven:       Number
  },
  achievements:          [{ type: String }],
  upcomingMilestones:    [{ type: String }],
  createdAt:             { type: Date, default: Date.now },
  verifiedAt:            { type: Date }
});

module.exports = mongoose.model('BusinessConnect', businessSchema);
