const mongoose = require('mongoose');

const photoGallaryYear = new mongoose.Schema({
  year: { type: Number, required: true, unique: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Year', photoGallaryYear);