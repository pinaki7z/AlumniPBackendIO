const express = require("express");
const router = express.Router();
const NotificationCenter = require("../models/notificationCenter");

// ========== CREATE ==========
// Called by other modules/controllers when notification needs to be created
router.post("/create", async (req, res) => {
  try {
    const notification = await NotificationCenter.create(req.body);
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
        { userId },         // user-specific
        { global: true },   // global (show to all)
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
      req.params.id, { read: true }, { new: true }
    );
    res.json({ success: true, notification: notif });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
});

// ========== DELETE NOTIFICATION ==========
router.delete("/:id", async (req, res) => {
  try {
    await NotificationCenter.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Notification deleted" });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
});

// ========== SWITCH OFF ALL NOTIFICATIONS FOR A TYPE (per user) ==========
router.put("/user/:userId/switch", async (req, res) => {
  // body: { type: "job", notificationOff: true }
  const { type, notificationOff } = req.body;
  const { userId } = req.params;
  try {
    // For future notifications
    await NotificationCenter.updateMany({ userId, type }, { notificationOff: notificationOff });
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
});

module.exports = router;
