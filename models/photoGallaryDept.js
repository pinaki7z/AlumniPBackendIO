const mongoose = require('mongoose');

const photoGallaryDept = new mongoose.Schema({
  name: { type: String, required: true },
  year: { type: mongoose.Schema.Types.ObjectId, ref: 'Year', required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Department', photoGallaryDept);