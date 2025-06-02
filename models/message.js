const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  sender: {type: mongoose.Schema.Types.ObjectId, ref: 'Alumni'},
  recipient: {type: mongoose.Schema.Types.ObjectId, ref: 'Alumni'},
  text: String,
  file: String,
  read:      { type: Boolean, default: false },    
}, {timestamps:true});

const Message = mongoose.model('Message', MessageSchema);

module.exports = Message;