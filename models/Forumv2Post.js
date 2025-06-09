const mongoose = require('mongoose');

const forumPostSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Alumni', required: true },
  topicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Forumv2Topic', required: true },
  title: { type: String, required: true },
  content: {
    images: [{ type: String }],
    html: { type: String },
  },
}, { timestamps: true });

module.exports = mongoose.model('Forumv2Post', forumPostSchema);
