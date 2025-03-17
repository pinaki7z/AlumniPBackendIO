const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema({
  title:String,
  description:String,
  createdAt: String,
  picturePath: [String],
  videoPath: Object,
  department: String,
  type: String
},
{ timestamps: true });

const News = mongoose.model('News', newsSchema);

module.exports = News;
