const mongoose = require('mongoose');

const forumReplySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Alumni', required: true },
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Forumv2Post', required: true },
  replyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Forumv2Reply', default: null }, // optional for nested replies
  content: {
    images: [{ type: String }],
    html: { type: String },
  },
}, { timestamps: true });

module.exports = mongoose.model('Forumv2Reply', forumReplySchema);
