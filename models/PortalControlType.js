// models/PortalControlType.js
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

let PortalControlTypeSchema = new Schema(
  {
    portalType: {
      type: String,
      required: true,
      enum: ['Community', 'University', 'School'],
      default: 'Community'
    },
    // Add a singleton flag to ensure only one document exists
    isSingleton: {
      type: Boolean,
      default: true,
      unique: true
    }
  },
  { 
    timestamps: true
  }
);

// Ensure only one document can exist
PortalControlTypeSchema.pre('save', async function(next) {
  if (this.isNew) {
    const existingDoc = await this.constructor.findOne();
    if (existingDoc) {
      const error = new Error('Only one portal control type document can exist');
      return next(error);
    }
  }
  next();
});

const PortalControlType = mongoose.model("PortalControlType", PortalControlTypeSchema);
module.exports = PortalControlType;
