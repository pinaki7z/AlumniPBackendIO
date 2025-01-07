const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
    link: { type: String, required: true }, 
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Alumni" }, 
    department: { type: String, required: false },
    createdAt: { type: Date, default: Date.now },
    date: {type: Date}
  });

const Image = mongoose.model('Image', imageSchema);

module.exports = Image;
