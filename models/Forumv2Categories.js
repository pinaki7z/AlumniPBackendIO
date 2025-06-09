const mongoose = require('mongoose');

const forumCategorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Alumni', required: true },
  name: { type: String, required: true },
  description: { type: String },
}, { timestamps: true }); // includes createdAt and updatedAt

module.exports = mongoose.model('Forumv2Category', forumCategorySchema);
