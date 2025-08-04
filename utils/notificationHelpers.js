// utils/notificationHelpers.js
const axios = require('axios');

const createNotification = async (notificationData) => {
  try {
    const response = await axios.post(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/notification-center/create`, notificationData);
    return response.data;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};

// Helper function to create verification warning
const createVerificationWarning = async (userId, expirationDate) => {
  const daysLeft = Math.ceil((new Date(expirationDate) - new Date()) / (1000 * 60 * 60 * 24));
  
  return await createNotification({
    userId,
    type: "admin",
    title: "ID Verification Required",
    message: `Your account will expire in ${daysLeft} days. Please upload your ID document to verify your account.`,
    read: false,
    global: false,
    meta: {
      expirationDate,
      daysLeft,
      action: "upload_id",
      url: "/home/profile/profile-settings"
    }
  });
};

// Helper function to create admin notifications for new ID submissions
const createAdminIdNotifications = async (userId, userName) => {
  const Alumni = require('../models/Alumni');
  
  try {
    // Get all admins (profileLevel 0 and 1)
    const admins = await Alumni.find({
      profileLevel: { $in: [0, 1] }
    });

    // Create notification for each admin
    const notificationPromises = admins.map(admin => 
      createNotification({
        userId: admin._id,
        type: "admin",
        title: "New ID Verification Request",
        message: `${userName} has uploaded their ID document and requires verification approval.`,
        relatedId: userId,
        read: false,
        global: false,
        meta: {
          requestingUserId: userId,
          requestingUserName: userName,
          action: "review_id",
          url: "/home/admin/user-verification"
        }
      })
    );

    await Promise.all(notificationPromises);
    return true;
  } catch (error) {
    console.error('Error creating admin notifications:', error);
    return false;
  }
};

// Helper function to create verification status notifications
const createVerificationStatusNotification = async (userId, status, reason, adminName) => {
  let title, message, type;

  switch (status) {
    case "approved":
      title = "ID Verification Approved";
      message = `Congratulations! Your ID document has been approved by ${adminName}. Your account is now verified.`;
      type = "admin";
      break;
    case "rejected":
      title = "ID Verification Rejected";
      message = `Your ID document has been rejected by ${adminName}. ${reason ? `Reason: ${reason}` : 'Please upload a new ID document.'}`;
      type = "admin";
      break;
    case "deleted":
      title = "Account Status Updated";
      message = `Your account has been marked as deleted by ${adminName}. Please contact support if you believe this is an error.`;
      type = "admin";
      break;
    case "restored":
      title = "Account Restored";
      message = `Your account has been restored by ${adminName}. You can now access all features.`;
      type = "admin";
      break;
    default:
      return null;
  }

  return await createNotification({
    userId,
    type,
    title,
    message,
    read: false,
    global: false,
    meta: {
      status,
      reason,
      adminName,
      action: status === "rejected" ? "upload_id" : null,
      url: status === "rejected" ? "/home/profile/profile-settings" : null
    }
  });
};

// Helper function to remove verification warnings
const removeVerificationWarning = async (userId) => {
  const NotificationCenter = require('../models/notificationCenter');
  
  try {
    await NotificationCenter.deleteMany({
      userId,
      type: "admin",
      title: "ID Verification Required"
    });
    return true;
  } catch (error) {
    console.error('Error removing verification warning:', error);
    return false;
  }
};

module.exports = {
  createNotification,
  createVerificationWarning,
  createAdminIdNotifications,
  createVerificationStatusNotification,
  removeVerificationWarning
};
