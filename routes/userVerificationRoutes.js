const express = require("express");
const userVerificationRoutes = express.Router();
const verifyToken = require("../utils");
const UserVerification = require("../models/userVerificationSchema");
const Alumni = require("../models/Alumni");
const { 
  createVerificationStatusNotification, 
  removeVerificationWarning 
} = require('../utils/notificationHelpers');


// Create user verification record
userVerificationRoutes.post("/create",  async (req, res) => {
  const { userId, expirationDate, accountDeleted, validated } = req.body;

  try {
    // Check if user exists
    const user = await Alumni.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if verification record already exists
    const existingVerification = await UserVerification.findOne({ userId });
    if (existingVerification) {
      return res.status(409).json({ message: "User verification record already exists" });
    }

    const newVerification = new UserVerification({
      userId,
      expirationDate: expirationDate || null,
      accountDeleted: accountDeleted || false,
      validated: validated || false
    });

    await newVerification.save();
    
    res.status(201).json({
      message: "User verification record created successfully",
      verification: newVerification
    });
  } catch (error) {
    console.error("Error creating user verification:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Get user verification by userId
userVerificationRoutes.get("/user/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const verification = await UserVerification.findOne({ userId }).populate('userId', 'firstName lastName email');
    
    if (!verification) {
      return res.status(404).json({ message: "User verification record not found" });
    }

    res.status(200).json(verification);
  } catch (error) {
    console.error("Error fetching user verification:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Get all user verifications with pagination
userVerificationRoutes.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const size = parseInt(req.query.size) || 10;
    const skip = (page - 1) * size;

    const total = await UserVerification.countDocuments();
    const verifications = await UserVerification.find()
      .populate('userId', 'firstName lastName email profileLevel')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(size);

    res.json({
      records: verifications,
      total,
      page,
      size
    });
  } catch (error) {
    console.error("Error fetching user verifications:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Update user verification
userVerificationRoutes.put("/:id",  async (req, res) => {
  const { id } = req.params;
  const { expirationDate, accountDeleted, validated } = req.body;

  try {
    const verification = await UserVerification.findById(id);
    
    if (!verification) {
      return res.status(404).json({ message: "User verification record not found" });
    }

    // Update fields if provided
    if (expirationDate !== undefined) verification.expirationDate = expirationDate;
    if (accountDeleted !== undefined) verification.accountDeleted = accountDeleted;
    if (validated !== undefined) verification.validated = validated;

    await verification.save();

    res.status(200).json({
      message: "User verification updated successfully",
      verification
    });
  } catch (error) {
    console.error("Error updating user verification:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Toggle validation status
userVerificationRoutes.put("/:id/toggle-validation",  async (req, res) => {
  const { id } = req.params;

  console.log("here")
  try {
    const verification = await UserVerification.findById(id);
    
    if (!verification) {
      return res.status(404).json({ message: "User verification record not found" });
    }

    // Toggle validation status
    verification.validated = !verification.validated;
    
    // If validating, remove expiration and ensure account is not deleted
    if (verification.validated) {
      verification.expirationDate = null;
      verification.accountDeleted = false;
    } else {
      // If invalidating, set expiration date to 7 days from now
      verification.expirationDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }

    await verification.save();
    res.status(200).json({
      message: `User validation ${verification.validated ? 'enabled' : 'disabled'} successfully`,
      verification
    });
  } catch (error) {
    console.error("Error toggling validation:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Toggle account deletion status
userVerificationRoutes.put("/:id/toggle-deletion",  async (req, res) => {
  const { id } = req.params;

  try {
    const verification = await UserVerification.findById(id);
    
    if (!verification) {
      return res.status(404).json({ message: "User verification record not found" });
    }

    // Toggle account deletion status
    verification.accountDeleted = !verification.accountDeleted;
    
    // If restoring account, set validation to false and add expiration
    if (!verification.accountDeleted) {
      verification.validated = false;
      verification.expirationDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    } else {
      // If deleting account, remove validation and expiration
      verification.validated = false;
      verification.expirationDate = null;
    }

    await verification.save();

    res.status(200).json({
      message: `Account ${verification.accountDeleted ? 'deleted' : 'restored'} successfully`,
      verification
    });
  } catch (error) {
    console.error("Error toggling account deletion:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Delete user verification record
userVerificationRoutes.delete("/:id",  async (req, res) => {
  const { id } = req.params;

  try {
    const verification = await UserVerification.findByIdAndDelete(id);
    
    if (!verification) {
      return res.status(404).json({ message: "User verification record not found" });
    }

    res.status(200).json({ message: "User verification record deleted successfully" });
  } catch (error) {
    console.error("Error deleting user verification:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Get expired user verifications
userVerificationRoutes.get("/expired", async (req, res) => {
  try {
    const currentDate = new Date();
    
    const expiredVerifications = await UserVerification.find({
      expirationDate: { $lt: currentDate },
      accountDeleted: false
    }).populate('userId', 'firstName lastName email');

    res.status(200).json({
      count: expiredVerifications.length,
      records: expiredVerifications
    });
  } catch (error) {
    console.error("Error fetching expired verifications:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Get verification statistics
userVerificationRoutes.get("/stats", async (req, res) => {
  try {
    const currentDate = new Date();
    
    const stats = await UserVerification.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          validated: { $sum: { $cond: ["$validated", 1, 0] } },
          accountDeleted: { $sum: { $cond: ["$accountDeleted", 1, 0] } },
          expired: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$expirationDate", null] },
                    { $lt: ["$expirationDate", currentDate] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    const result = stats[0] || {
      total: 0,
      validated: 0,
      accountDeleted: 0,
      expired: 0
    };

    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching verification statistics:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});


// Get pending ID approvals (Primary tab data)
userVerificationRoutes.get("/pending-ids", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const size = parseInt(req.query.size) || 10;
    const skip = (page - 1) * size;

    const pendingIds = await UserVerification.find({
      idApprovalStatus: 'pending',
      ID: { $ne: null }
    })
    .populate('userId', 'firstName lastName email profileLevel department batch profilePicture')
    .sort({ idUploadedAt: -1 })
    .skip(skip)
    .limit(size);

    const total = await UserVerification.countDocuments({
      idApprovalStatus: 'pending',
      ID: { $ne: null }
    });

    res.json({
      records: pendingIds,
      total,
      page,
      size
    });
  } catch (error) {
    console.error("Error fetching pending IDs:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Approve ID
// Update the approve ID route
userVerificationRoutes.put("/:id/approve-id", async (req, res) => {
  const { id } = req.params;
  const adminId = req.body.adminId;

  try {
    const verification = await UserVerification.findById(id).populate('userId');
    
    if (!verification) {
      return res.status(404).json({ message: "User verification record not found" });
    }

    if (verification.idApprovalStatus !== 'pending') {
      return res.status(400).json({ message: "ID is not in pending status" });
    }

    // Get admin info
    const admin = await Alumni.findById(adminId);

    // Update verification record
    verification.idApprovalStatus = 'approved';
    verification.idApprovedBy = adminId;
    verification.idApprovedAt = new Date();
    verification.validated = true;
    verification.expirationDate = null;

    await verification.save();

    // Create notification for user
    await createVerificationStatusNotification(
      verification.userId._id,
      'approved',
      null,
      `${admin.firstName} ${admin.lastName}`
    );

    // Remove warning notification if exists
    await removeVerificationWarning(verification.userId._id);

    res.status(200).json({
      message: "ID approved successfully",
      verification
    });
  } catch (error) {
    console.error("Error approving ID:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});


// Update the reject ID route
userVerificationRoutes.put("/:id/reject-id", async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const adminId = req.body.adminId;

  try {
    const verification = await UserVerification.findById(id).populate('userId');
    
    if (!verification) {
      return res.status(404).json({ message: "User verification record not found" });
    }

    if (verification.idApprovalStatus !== 'pending') {
      return res.status(400).json({ message: "ID is not in pending status" });
    }

    // Get admin info
    const admin = await Alumni.findById(adminId);

    // Update verification record
    verification.idApprovalStatus = 'rejected';
    verification.idApprovedBy = adminId;
    verification.idApprovedAt = new Date();
    verification.idRejectionReason = reason || 'No reason provided';
    verification.validated = false;

    await verification.save();

    // Create notification for user
    await createVerificationStatusNotification(
      verification.userId._id,
      'rejected',
      reason,
      `${admin.firstName} ${admin.lastName}`
    );

    res.status(200).json({
      message: "ID rejected successfully",
      verification
    });
  } catch (error) {
    console.error("Error rejecting ID:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});


// Get ID approval statistics
userVerificationRoutes.get("/id-stats", async (req, res) => {
  try {
    const stats = await UserVerification.aggregate([
      {
        $group: {
          _id: null,
          totalWithIds: { $sum: { $cond: [{ $ne: ["$ID", null] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ["$idApprovalStatus", "pending"] }, 1, 0] } },
          approved: { $sum: { $cond: [{ $eq: ["$idApprovalStatus", "approved"] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ["$idApprovalStatus", "rejected"] }, 1, 0] } },
          notUploaded: { $sum: { $cond: [{ $eq: ["$idApprovalStatus", "not-uploaded"] }, 1, 0] } }
        }
      }
    ]);

    const result = stats[0] || {
      totalWithIds: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      notUploaded: 0
    };

    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching ID statistics:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = userVerificationRoutes;
