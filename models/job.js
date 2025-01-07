const mongoose = require('mongoose');

const jobsSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  userName: String,
  profilePicture: String,
  title:String,
  location:String,
  company: String,
  salaryMin: Number,
  salaryMax: Number,
  picture: String,
  coverImage:String,
  currency: String,
  duration: String,
  employmentType: String,
  category: String,
  verified: Boolean,
  questions: [],
  answers: {
    question: String,
    answer: String
  },
  description: String,
  type: String,
  attachments: [String],
  archive: Boolean,
  starred: [String],
  approved: Boolean,
  locationType: {
    onSite: Boolean,
    remote: Boolean,
    hybrid: Boolean
  },
  appliedCandidates: [{
    userId: String,
    name: String,
    resume: String,
    appliedAt: Date,
    status: String,
    comment: String,
    answers: [{
      question: String,
      answer: String
    }]
  }]

},
{ timestamps: true });

const Jobs = mongoose.model('Jobs', jobsSchema);

module.exports = Jobs;
