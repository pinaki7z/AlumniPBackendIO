const mongoose = require('mongoose');

const internshipsSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  title: String,
  userName: String,
  profilePicture: String,
  location: String,
  salaryMin: Number,
  company: String,
  salaryMax: Number,
  picture: String,
  currency: String,
  duration: String,
  employmentType: String,
  category: String,
  questions: [],
  description: String,
  attachments: [String],
  archive: Boolean,
  coverImage:String,
  starred: [String],
  type: String,
  locationType: {
    onSite: Boolean,
    remote: Boolean,
    hybrid: Boolean
  },
  approved: Boolean,
  appliedCandidates: [{
    userId: String,
    name: String,
    resume: String,
    appliedAt: Date,
    status: String,
    comment: String,
  }]
},
{ timestamps: true });

const Internship = mongoose.model('Internships', internshipsSchema);

module.exports = Internship;