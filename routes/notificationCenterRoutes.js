// routes/notificationCenterRoutes.js
const express = require("express");
const router = express.Router();
const NotificationCenter = require("../models/notificationCenter");
const { emitNotification, emitNotificationRead, emitNotificationRemoved } = require("../utils/socket");

// ========== CREATE ==========
router.post("/create", async (req, res) => {
  try {
    const notification = await NotificationCenter.create(req.body);
    
    // **NEW: Use socket module for real-time notification**
    emitNotification(notification);
    
    res.status(201).json({ success: true, notification });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
});

// ========== GET USER NOTIFICATIONS ==========
router.get("/user/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const notifications = await NotificationCenter.find({
      $or: [
        { userId }, 
        { global: true },
      ]
    }).sort({ createdAt: -1 });

    res.json({ success: true, notifications });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
});

// ========== MARK NOTIFICATION AS READ ==========
router.patch("/:id/read", async (req, res) => {
  try {
    const notif = await NotificationCenter.findByIdAndUpdate(
      req.params.id, 
      { read: true }, 
      { new: true }
    );
    
    // **NEW: Use socket module to emit read status**
    if (notif) {
      emitNotificationRead(notif._id, notif.userId, notif.global);
    }
    
    res.json({ success: true, notification: notif });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
});

// ========== DELETE NOTIFICATION ==========
router.delete("/:id", async (req, res) => {
  try {
    const notif = await NotificationCenter.findById(req.params.id);
    
    if (notif) {
      await NotificationCenter.findByIdAndDelete(req.params.id);
      
      // **NEW: Use socket module to emit deletion**
      emitNotificationRemoved(notif._id, notif.userId, notif.global);
    }
    
    res.json({ success: true, message: "Notification deleted" });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
});

// ========== SWITCH OFF ALL NOTIFICATIONS FOR A TYPE ==========
router.put("/user/:userId/switch", async (req, res) => {
  const { type, notificationOff } = req.body;
  const { userId } = req.params;
  try {
    await NotificationCenter.updateMany({ userId, type }, { notificationOff: notificationOff });
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
});

module.exports = router;
