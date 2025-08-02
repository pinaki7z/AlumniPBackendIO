const mongoose = require("mongoose");
const Schema = mongoose.Schema;

let UserVerificationSchema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Alumni",
      required: true,
      unique: true
    },
    expirationDate: {
      type: Date,
      default: null
    },
    accountDeleted: {
      type: Boolean,
      default: false
    },
    validated: {
      type: Boolean,
      default: false
    },
    ID: {
      type: String,
      default: null // URL to the ID document
    },
    idUpdated: {
      type: Boolean,
      default: false // Tracks if ID was recently updated
    },
    idUploadedAt: {
      type: Date,
      default: null // When the ID was uploaded
    },
    idApprovalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'not-uploaded'],
      default: 'not-uploaded'
    },
    idApprovedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Alumni",
      default: null
    },
    idApprovedAt: {
      type: Date,
      default: null
    },
    idRejectionReason: {
      type: String,
      default: null
    }
  },
  { timestamps: true }
);

const UserVerification = mongoose.model("UserVerification", UserVerificationSchema);
module.exports = UserVerification;
