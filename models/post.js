

const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  userId: {
    type: String,
  },
  profilePicture: {
    type: String,
  },
  reported: Boolean,
  content: {
    type: String,
  },
  userName: {
    type: String,
  },
  comments: [this],
});

commentSchema.add({ comments: [commentSchema] });


const postSchema = mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    location: String,
    userName: String,
    groupID: String,
    archive: Boolean,
    blockedUserIds: [{
      userId: String,
      content: String,
      commentId: String,
      expiryDate: Date,
      userName: String,
      sent: Boolean
    }],
    description: String,
    picturePath: [String],
    profilePicture: String,
    likes: [
      {
        userId: {
          type: String,
        },
        userName: {
          type: String,
        },
      },
    ],
    smile: [
      {
        userId: {
          type: String,
        },
        userName: {
          type: String,
        },
      },
    ],
    clap: [
      {
        userId: {
          type: String,
        },
        userName: {
          type: String,
        },
      },
    ],
    thumbsUp: [
      {
        userId: {
          type: String,
        },
        userName: {
          type: String,
        },
      },
    ],    
    comments: [commentSchema],
    videoPath: Object,
    type: String
  },
  
  { timestamps: true }
);

const Post = mongoose.model("Post", postSchema);

module.exports= Post;