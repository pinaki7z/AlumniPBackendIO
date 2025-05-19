const mongoose = require('mongoose');

const photoGalleryImageSchema = new mongoose.Schema({
  yearId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Year',
    required: true
  },
  deptId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true
  },
  imageUrl: {
    type: String,
    required: true // assuming image link is mandatory
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('PhotoGalleryImage', photoGalleryImageSchema);
