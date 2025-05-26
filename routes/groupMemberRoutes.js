const express = require("express");
const router = express.Router();
const GroupMember = require("../models/groupMembers");

router.post("/add", async (req, res) => {
  try {
    const { groupId, userId, approved } = req.body;
    const groupMember = await GroupMember.findOne({ groupId, userId  });
    if (groupMember) {
      return res.status(400).json({ message: "User already a member of group" });
    }
    const newGroupMember = new GroupMember({ groupId, userId, approved });
    await newGroupMember.save();
    return res.status(201).json(newGroupMember);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});


router.get("/all/:groupId", async (req, res) => {
  try {
    const groupId = req.params.groupId;
    const groupMembers = await GroupMember.find({ groupId, approved: true }).populate("userId", "firstName lastName profilePicture");
    return res.status(200).json(groupMembers);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get("/isMember/:groupId/:userId", async (req, res) => {
  try {
    const { groupId, userId } = req.params;
    const groupMember = await GroupMember.findOne({ groupId, userId });
    if (groupMember ) {
      return res.status(200).json({ isMember: true, approved: groupMember.approved });
    }
    return res.status(200).json({ isMember: false, });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get("/joined/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const joinedGroups = await GroupMember.find({ userId, approved: true }).populate("groupId");
    const groups = joinedGroups.filter(member => member.groupId).map(member => member.groupId);
    return res.status(200).json({records:groups});
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.put("/accept/:groupId/:userId", async (req, res) => {
  try {
    const { groupId, userId } = req.params;
    const groupMember = await GroupMember.findOne({ groupId, userId });
    if (groupMember) {
      groupMember.approved = true;
      await groupMember.save();
      return res.status(200).json({ message: "User accepted" });
    }
    return res.status(404).json({ message: "User not found" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.put("/decline/:groupId/:userId", async (req, res) => {
  try {
    const { groupId, userId } = req.params;
    await GroupMember.findOneAndDelete({ groupId, userId });
    return res.status(200).json({ message: "User declined" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get("/pending/:groupId", async (req, res) => {
  try {
    const groupId = req.params.groupId;
    const pendingMembers = await GroupMember.find({ groupId, approved: false }).populate("userId", "firstName lastName profilePicture");
    return res.status(200).json(pendingMembers);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});


module.exports = router;
