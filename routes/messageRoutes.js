// routes/messageRoutes.js
const express = require("express");
const router = express.Router();
const Message = require("../models/message");

// GET /messages/:userId/:otherId — chat history
router.get("/:userId/:otherId", async (req, res) => {
  try {
    const { userId, otherId } = req.params;
    const messages = await Message.find({
      $or: [
        { sender: userId,   recipient: otherId },
        { sender: otherId,  recipient: userId }
      ]
    })
    .sort("createdAt");
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.patch("/:userId/:otherId/read", async (req, res) => {
  try {
    const { userId, otherId } = req.params;
    await Message.updateMany(
      { sender: otherId, recipient: userId, read: false },
      { $set: { read: true } }
    );
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
