

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
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Alumni',
      required: true,
    },
    firstName: {
      type: String,
      // required: true,
    },
    lastName: {
      type: String,
      // required: true,
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
    youtubeVideoId: String,
    picturePath: [String],
    profilePicture: String,
    postUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Alumni',
    },
    likes: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Alumni',
        },
        userName: {
          type: String,
        },
      },
    ],
    smile: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Alumni',
        },
        userName: {
          type: String,
        },
      },
    ],
    clap: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Alumni',
        },
        userName: {
          type: String,
        },
      },
    ],
    thumbsUp: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Alumni',
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