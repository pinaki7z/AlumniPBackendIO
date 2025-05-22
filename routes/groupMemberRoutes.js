const express = require("express");
const router = express.Router();
const GroupMember = require("../models/groupMembers");

router.post("/add", async (req, res) => {
  try {
    const { groupId, userId } = req.body;
    const groupMember = await GroupMember.findOne({ groupId, userId });
    if (groupMember) {
      return res.status(400).json({ message: "User already a member of group" });
    }
    const newGroupMember = new GroupMember({ groupId, userId });
    await newGroupMember.save();
    return res.status(201).json(newGroupMember);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get("/all/:groupId", async (req, res) => {
  try {
    const groupId = req.params.groupId;
    const groupMembers = await GroupMember.find({ groupId });
    return res.status(200).json(groupMembers);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;
