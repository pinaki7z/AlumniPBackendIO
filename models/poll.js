const mongoose = require("mongoose");

const pollSchema = new mongoose.Schema({
 userId: {
       type: mongoose.Schema.Types.ObjectId,
       ref: 'Alumni',
       required: true,
     },
  userName: String,
  profilePicture: String,
  type: String,
  archive: Boolean,
  question: {
    type: String,
    required: true,
  },
  multipleAnswers: Boolean,
  groupID: String,
  options: [
    {
      option: {
        type: String,
      },
      votes: [
        {
          userId: String,
          userName: String,
          profilePicture: String
        }
      ],
    },
  ],
}, { timestamps: true });

const Poll = mongoose.model("Poll", pollSchema);

module.exports = Poll;
