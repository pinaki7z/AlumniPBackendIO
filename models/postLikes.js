const mongoose = require('mongoose');

const likeSchema = new mongoose.Schema({
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Alumni',
    required: true,
  },
  userName: {
    type: String,
    required: true,
  },
  likeType: {
    type: String,
    enum: ['like', 'smile', 'clap', 'thumbsUp'],
    default: 'like',
  },
}, { timestamps: true });

// Compound index to ensure one like per user per post
likeSchema.index({ postId: 1, userId: 1 }, { unique: true });
likeSchema.index({ userId: 1 });

const Like = mongoose.model("Like", likeSchema);
module.exports = Like;
