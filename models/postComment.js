const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true,
  },
  parentCommentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null, // null for top-level comments
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
  profilePicture: {
    type: String,
  },
  content: {
    type: String,
    required: true,
    maxLength: 1000,
  },
  reported: {
    type: Boolean,
    default: false,
  },
  likes: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Alumni',
    },
    reaction: {
      type: String,
      enum: ['like', '👍', '❤️', '😂', '😮', '😢', '😡'],
      default: 'like'
    }
  }],
  likeCount: {
    type: Number,
    default: 0,
  },
  // For tracking reply count without loading all replies
  replyCount: {
    type: Number,
    default: 0,
  },
  isEdited: {
    type: Boolean,
    default: false,
  },
  editedAt: {
    type: Date,
  },
}, { timestamps: true });

// Indexes for efficient queries
commentSchema.index({ postId: 1, createdAt: -1 });
commentSchema.index({ parentCommentId: 1, createdAt: 1 });
commentSchema.index({ userId: 1 });
commentSchema.index({ reported: 1 });

const Comment = mongoose.model("postComment", commentSchema);
module.exports = Comment;