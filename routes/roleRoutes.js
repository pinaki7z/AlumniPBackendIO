// routes/roleRoutes.js
const express = require("express");
const roleRoutes = express.Router();
const Role = require("../models/Role");
const Alumni = require("../models/Alumni");
const verifyToken = require("../utils");

// Get all users with their roles
roleRoutes.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const size = parseInt(req.query.size) || 20;
    const skip = (page - 1) * size;

    const users = await Alumni.aggregate([
      { $match: { profileLevel: { $ne: 0 } } }, // Exclude super admin
      {
        $lookup: {
          from: "roles",
          localField: "_id",
          foreignField: "alumniId",
          as: "role"
        }
      },
      {
        $project: {
          firstName: 1,
          lastName: 1,
          email: 1,
          profileLevel: 1,
          profilePicture: 1,
          department: 1,
          batch: 1,
          role: { $arrayElemAt: ["$role", 0] },
          type: {
            $switch: {
              branches: [
                { case: { $eq: ["$profileLevel", 1] }, then: "admin" },
                { case: { $eq: ["$profileLevel", 2] }, then: "alumni" },
                { case: { $eq: ["$profileLevel", 3] }, then: "student" }
              ],
              default: "student"
            }
          }
        }
      },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: size }
    ]);

    const total = await Alumni.countDocuments({ profileLevel: { $ne: 0 } });

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          size,
          total,
          pages: Math.ceil(total / size)
        }
      }
    });
  } catch (error) {
    console.error("Error fetching users with roles:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users with roles",
      error: error.message
    });
  }
});

// Get specific user's roles
roleRoutes.get("/:alumniId", async (req, res) => {
  try {
    const { alumniId } = req.params;

    const user = await Alumni.findById(alumniId).select("firstName lastName email profileLevel");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    let role = await Role.findOne({ alumniId });
    if (!role) {
      // Create default role if doesn't exist
      role = new Role({ alumniId });
      await role.save();
    }

    res.json({
      success: true,
      data: {
        user,
        role
      }
    });
  } catch (error) {
    console.error("Error fetching user roles:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user roles",
      error: error.message
    });
  }
});

// Update user roles
roleRoutes.put("/:alumniId", verifyToken, async (req, res) => {
  try {
    const { alumniId } = req.params;
    const {
      feeds, members, groups, news, events,
      photoGallery, profanity, fullAdmin
    } = req.body;

    // Check if user exists
    const user = await Alumni.findById(alumniId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Update or create role
    const updatedRole = await Role.findOneAndUpdate(
      { alumniId },
      {
        feeds: feeds || {},
        members: members || {},
        groups: groups || {},
        news: news || {},
        events: events || {},
        photoGallery: photoGallery || {},
        profanity: profanity || {},
        fullAdmin: fullAdmin || {}
      },
      {
        new: true,
        upsert: true,
        runValidators: true
      }
    );

    res.json({
      success: true,
      message: "User roles updated successfully",
      data: updatedRole
    });
  } catch (error) {
    console.error("Error updating user roles:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update user roles",
      error: error.message
    });
  }
});

// Bulk update roles for multiple users
roleRoutes.put("/bulk/update", verifyToken, async (req, res) => {
  try {
    const { updates } = req.body; // Array of { alumniId, roles }

    const results = [];
    for (const update of updates) {
      try {
        const updatedRole = await Role.findOneAndUpdate(
          { alumniId: update.alumniId },
          update.roles,
          {
            new: true,
            upsert: true,
            runValidators: true
          }
        );
        results.push({
          alumniId: update.alumniId,
          success: true,
          role: updatedRole
        });
      } catch (error) {
        results.push({
          alumniId: update.alumniId,
          success: false,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: "Bulk role update completed",
      data: results
    });
  } catch (error) {
    console.error("Error in bulk role update:", error);
    res.status(500).json({
      success: false,
      message: "Failed to perform bulk role update",
      error: error.message
    });
  }
});

// Reset user roles to default
roleRoutes.delete("/:alumniId", verifyToken, async (req, res) => {
  try {
    const { alumniId } = req.params;

    await Role.findOneAndDelete({ alumniId });

    res.json({
      success: true,
      message: "User roles reset to default"
    });
  } catch (error) {
    console.error("Error resetting user roles:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reset user roles",
      error: error.message
    });
  }
});

// Get role statistics
roleRoutes.get("/stats/overview", async (req, res) => {
  try {
    const totalUsers = await Alumni.countDocuments({ profileLevel: { $ne: 0 } });
    const usersWithRoles = await Role.countDocuments();
    const usersWithoutRoles = totalUsers - usersWithRoles;

    // Get users with full admin access
    const fullAdmins = await Role.countDocuments({
      "fullAdmin.all": true
    });

    // Get users with specific permissions
    const feedsManagers = await Role.countDocuments({
      $or: [
        { "feeds.all": true },
        { "feeds.create": true, "feeds.update": true, "feeds.delete": true }
      ]
    });

    const eventManagers = await Role.countDocuments({
      $or: [
        { "events.all": true },
        { "events.create": true, "events.update": true, "events.delete": true }
      ]
    });

    res.json({
      success: true,
      data: {
        totalUsers,
        usersWithRoles,
        usersWithoutRoles,
        fullAdmins,
        feedsManagers,
        eventManagers
      }
    });
  } catch (error) {
    console.error("Error fetching role statistics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch role statistics",
      error: error.message
    });
  }
});

module.exports = roleRoutes;
