const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  groupName: String,
  userId: String,
  groupLogo: String,
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
  groupType: String,
  isUserAdded: Boolean,
  department: String,
  groupPicture: String,
  businessConnect: Boolean,
});

const Group = mongoose.model('Group', groupSchema);

module.exports = Group;
