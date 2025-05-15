const mongoose = require("mongoose");

const validColors = [
  "#ffeb3c",
  "#ff9900",
  "#f44437",
  "#ea1e63",
  "#9c26b0",
  "#3f51b5",
  "#009788",
  "#4baf4f",
  "#7e5d4e",
];

const eventSchema = new mongoose.Schema({
  userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Alumni',
        required: true,
      },
  userName: String,
  profilePicture: String,
  start: String,
  end: String,
  title: String,
  description: String,
  startTime: String,
  endTime: String,
  allDay: Boolean,
  free: Boolean,
  priceType: String,
  amount: Number,
  currency: String,
  picture: String,
  type: String,
  cName: String,
  cNumber: Number,
  archive: Boolean,
  cEmail: String,
  location: String,
  department: String,
  createdAt: Date,
  groupEvent: Boolean,
  groupId: String,
  createGroup: Boolean,
  attendance: Number,
  willAttend: [
    {
      userId: String,
      userName: String,
      graduatingYear: Number,
      classNo: Number,
      department: String,
      profilePicture: String,
    },
  ],
  mightAttend: [
    {
      userId: String,
      userName: String,
      graduatingYear: Number,
      classNo: Number,
      department: String,
      profilePicture: String,
    },
  ],
  willNotAttend: [
    {
      userId: String,
      userName: String,
      graduatingYear: Number,
      classNo: Number,
      department: String,
      profilePicture: String,
    },
  ],
  color: {
    type: String,
    enum: validColors,
    default: validColors[0],
  },
});

const Event = mongoose.model("Event", eventSchema);

module.exports = Event;
