const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  userId: {
    type: String,
  },
  content: {
    type: String,
  },
  reported: Boolean,
  userName: {
    type: String,
  },
  comments: [this],
  
});


commentSchema.add({ comments: [commentSchema] });


const forumSchema = new mongoose.Schema({
  title: String,
  userId: String,
  description: String,
  profilePicture: String,
  userName: String,
  blockedUserIds: [{
    userId: String,
    content: String,
    commentId: String,
    expiryDate: Date,
    userName: String,
    sent: Boolean
  }],
  picture: String,
  department: String,
  video: String,
  members: [String],
  totalTopics: Number,
  createdAt: Date,
  type: String,
  comment: Boolean,
  deleteComment: Boolean,
  comments: [commentSchema], 
});

const Forum = mongoose.model('Forum', forumSchema);

module.exports = Forum;
