const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema({
  title:String,
  userId:{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Alumni',
    required: true,
  },
  description:String,
  createdAt: String,
  picturePath: [String],
  videoPath: Object,
  department: String,
  type: String,
  author: String,
  picture: String,
},
{ timestamps: true });

const News = mongoose.model('News', newsSchema);

module.exports = News;
