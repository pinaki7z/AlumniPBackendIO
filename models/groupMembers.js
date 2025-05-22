const mongoose = require('mongoose');

const groupMemberSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Alumni',
    required: true
  },
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  approved: {
    type: Boolean,
    default: false
  }
});

const GroupMember = mongoose.model('GroupMember', groupMemberSchema);

module.exports = GroupMember;

