// models/Role.js
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const PermissionSchema = new Schema({
  all: { type: Boolean, default: false },
  view: { type: Boolean, default: false },
  create: { type: Boolean, default: false },
  update: { type: Boolean, default: false },
  delete: { type: Boolean, default: false }
});

const RoleSchema = new Schema({
  alumniId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Alumni",
    required: true,
    unique: true
  },
  feeds: {
    type: PermissionSchema,
    default: () => ({})
  },
  members: {
    type: PermissionSchema,
    default: () => ({})
  },
  groups: {
    type: PermissionSchema,
    default: () => ({})
  },
  news: {
    type: PermissionSchema,
    default: () => ({})
  },
  events: {
    type: PermissionSchema,
    default: () => ({})
  },
  photoGallery: {
    type: PermissionSchema,
    default: () => ({})
  },
  profanity: {
    type: PermissionSchema,
    default: () => ({})
  },
  fullAdmin: {
    type: PermissionSchema,
    default: () => ({})
  }
}, { 
  timestamps: true 
});

const Role = mongoose.model("Role", RoleSchema);
module.exports = Role;
