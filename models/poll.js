const mongoose = require("mongoose");

const pollSchema = new mongoose.Schema({
  userId: String,
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
