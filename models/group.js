const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  groupName: String,
  userId: String,
  groupLogo: String,
  groupBackground: String,
  members: [
    {
    userId: String,
    profilePicture: String,
    userName: String,
    profileLevel: Number
  }
],
  createdAt: Date,
  category: String,
  groupType: { type: String, default: 'public' },
  isUserAdded: Boolean,
  department: String,
  groupPicture: String,
  businessConnect: Boolean,
});

const Group = mongoose.model('Group', groupSchema);

module.exports = Group;
