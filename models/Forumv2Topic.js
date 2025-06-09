const mongoose = require('mongoose');

const forumTopicSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Alumni', required: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Forumv2Category', required: true },
  title: { type: String, required: true },
  isPinned: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Forumv2Topic', forumTopicSchema);
