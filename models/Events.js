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
  userName: {
    type: String,
    required: true
  },
  profilePicture: {
    type: String,
    default: ""
  },
  start: {
    type: String,
    required: true
  },
  end: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ""
  },
  startTime: {
    type: String,
    default: "00:00"
  },
  endTime: {
    type: String,
    default: "00:00"
  },
  allDay: {
    type: Boolean,
    default: false
  },
  free: {
    type: Boolean,
    default: true
  },
  priceType: {
    type: String,
    enum: ['free', 'paid'],
    default: 'free'
  },
  amount: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    default: 'INR'
  },
  picture: {
    type: String,
    default: ""
  },
  type: {
    type: String,
    default: "event"
  },
  cName: {
    type: String,
    required: true
  },
  cNumber: {
    type: String,
    required: true
  },
  archive: {
    type: Boolean,
    default: false
  },
  cEmail: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  department: {
    type: String,
    default: "All"
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  groupEvent: {
    type: Boolean,
    default: false
  },
  groupId: {
    type: String,
    default: ""
  },
  createGroup: {
    type: Boolean,
    default: false
  },
  attendance: {
    type: Number,
    default: 0
  },
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
  // New fields for post-like display
  likes: [{
    userId: String,
    userName: String,
    profilePicture: String
  }],
  comments: [{
    userId: String,
    userName: String,
    profilePicture: String,
    content: String,
    createdAt: {
      type: Date,
      default: Date.now
    },
    comments: [{
      userId: String,
      userName: String,
      profilePicture: String,
      content: String,
      createdAt: {
        type: Date,
        default: Date.now
      }
    }]
  }],
  shares: [{
    userId: String,
    userName: String,
    sharedAt: {
      type: Date,
      default: Date.now
    }
  }]
});

// Pre-save middleware to update the updatedAt field
eventSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const Event = mongoose.model("Event", eventSchema);

module.exports = Event;
