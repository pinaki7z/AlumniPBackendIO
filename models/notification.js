const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  userId: {
    type: String,
  },
  requestedUserName: {
    type: String,
    required: true,
  },
  followedUser: {
    type: String,
  },
  followedUserName: {
    type: String,
  },
  groupId: {
    type: String,
  },
  forumId: {
    type: String,  
  },
  groupName: {
    type: String,
  },
  forumName: {
    type: String,
  },
  ownerId: {
    type: String,
  },
  link: {
    type: String,
  },
  businessVerification: String,
  status: {
    type: Boolean,
  },
  ID: String, 
  job: Boolean,
  jobId: String,
  commentId: String,
  comment: String,
  follow: Boolean,
},
{ timestamps: true });

const Notification = mongoose.model('Notification', NotificationSchema);

module.exports = Notification;