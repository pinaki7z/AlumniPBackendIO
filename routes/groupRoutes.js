const express = require("express");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const verifyToken = require("../utils");
const checkProfileLevel = require("../middleware/checkProfileLevel");
const Alumni = require("../models/Alumni");
const Group = require("../models/group");
const Notification = require("../models/notification");
const multer = require("multer");
const path = require("path");
const Post = require("../models/post");
const Poll = require("../models/poll");
const Event = require("../models/Events");
const Job = require("../models/job");

const groupRoutes = express.Router();
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname)); // File name with extension
  },
});


const fileFilter = (req, file, cb) => {
  if (
    
    file.mimetype === "application/pdf"
  ) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF file is allowed"));
  }
};


const upload = multer({ storage: storage, fileFilter: fileFilter });

const mergeSortAndPaginate = async (page, size, groupID) => {
  const skip = (page - 1) * size;

  // Fetch the total number of documents for each collection
  const [totalPosts, totalPolls, totalEvents] = await Promise.all([
    Post.countDocuments({ groupID }),
    Poll.countDocuments({ groupID }),
    Event.countDocuments({ groupId: groupID }),
  ]);

  // Fetch the actual paginated records from each collection
  const [posts, polls, events] = await Promise.all([
    Post.find({ groupID })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(size),

    Poll.find({ groupID })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(size),

    Event.find({ groupId: groupID })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(size),
  ]);

  // Combine the records and sort them by createdAt
  const combinedRecords = [...posts, ...polls, ...events]
    .sort((a, b) => b.createdAt - a.createdAt);

  // Paginate the final sorted combined result
  const paginatedRecords = combinedRecords.slice(0, size);

  // Calculate the total number of documents
  const totalDocuments = totalPosts + totalPolls + totalEvents;

  // Return both the paginated records and the total count
  return {
    paginatedRecords,
    totalDocuments,
  };
};



groupRoutes.post("/create", async (req, res) => {
  const {
    userId,
    groupName,
    member,
    groupLogo,
    groupType,
    category,
    groupPicture,
  } = req.body;

  try {    
    const user = await Alumni.findById(userId);
    let businessConnect = false;

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    const existingGroup = await Group.findOne({ groupName: groupName });

    if (existingGroup) {
      return res.status(400).json({
        message: "Group name already exists. Please choose a different name.",
      });
    }

    if (category === "Business Connect") {
      const existingBconnectGroup = await Group.findOne({ category: "Business Connect" });

      if (existingBconnectGroup) {
        return res.status(400).json({
          message: "Business Connect group already exists. Please choose a different category.",
        });
      }
      businessConnect = true;
    };

    const currentDate = new Date();
    const newGroup = new Group({
      userId,
      groupName,
      groupLogo,
      createdAt: currentDate,
      members: [member],
      groupType,
      category,
      businessConnect,
      groupPicture,
      department: user.department, 
    });

    await Alumni.updateMany(
      { _id: { $in: member.userId } },
      { $addToSet: { groupNames: newGroup._id } }
    );

    await newGroup.save();

    res.status(201).json(newGroup);
  } catch (error) {
    res.status(500).json({message: error});
  }
});


groupRoutes.get("/joined", async (req, res) => {
  try {
    const { userId } = req.query;
    const page = parseInt(req.query.page);
    const size = parseInt(req.query.size);
    const skip = (page - 1) * size;

    const total = await Group.countDocuments({ "members.userId": userId });
    const groups = await Group.find({ "members.userId": userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(size);

    res.json({
      records: groups,
      total,
      page,
      size,
    });
  } catch (error) {
    console.error(error);
    res.status(400).json(error);
  }
});

groupRoutes.get("/:_id", async (req, res) => {
  try {
    const group = await Group.findById(req.params._id);
    if (!group) {
      console.error("No such group");
      return res.status(404).send("group not found");
    }

    res.status(200).json(group);
  } catch (err) {
    return res.status(400).send(err);
  }
});

groupRoutes.get("/groups/businessConnect", async (req, res) => {
  try {
    const businessConnect = await Group.find({ category: "Business Connect" });
    res.json({businessConnect});
  } catch (err) {
    res.status(500).json({ message: "Error fetching business connect group" });
  }
});

groupRoutes.get("/groups/newest", async (req, res) => {
  try {
    const newestGroups = await Group.find({ isNewest: true });
    res.json(newestGroups);
  } catch (err) {
    res.status(500).json({ err });
  }
});

groupRoutes.get("/groups/popular", async (req, res) => {
  try {
    const popularGroups = await Group.find({ isPopular: true });
    res.json(popularGroups);
  } catch (err) {
    res.status(500).json({ message: "Error fetching popular Groups" });
  }
});

groupRoutes.put("/members/:_id", async (req, res) => {
  const { members, notificationId } = req.body;
  const { _id } = req.params;

  try {
    if (notificationId) {
      await Notification.findByIdAndDelete(notificationId);
    }

    const group = await Group.findById(_id);
    if (!group) {
      console.error("No such group");
      return res.status(404).send("Group not found");
    }

    let addedMembers = [];
    let removedMembers = [];

    // Normalize members to always be an array, whether it's a single object or already an array
    const membersArray = !members
      ? [] // Handle null or undefined members
      : Array.isArray(members)
        ? members // Already an array, use as is
        : [members]; // Single object, wrap in an array

    for (let member of membersArray) {
      // Ensure that member object exists and has userId
      if (!member || !member.userId) {
        console.error("Invalid member or missing userId", member);
        continue;
      }

      const user = await Alumni.findById(member.userId);
      if (!user) {
        console.error(`No such user with ID: ${member.userId}`);
        continue;
      }

      const memberIndex = group.members.findIndex((m) => m.userId.toString() === member.userId);

      if (memberIndex !== -1) {
        // If the member already exists, remove them
        group.members.splice(memberIndex, 1);
        removedMembers.push(member);
        const groupIndex = user.groupNames.indexOf(_id);
        if (groupIndex !== -1) {
          user.groupNames.splice(groupIndex, 1);
        }
      } else {
        // If the member doesn't exist, add them
        group.members.push(member);
        addedMembers.push(member);
        if (!user.groupNames.includes(_id)) {
          user.groupNames.push(_id);
        }
      }

      await user.save();
    }

    await group.save();

    return res.status(200).json({
      message: "Group updated successfully",
      addedMembers,
      removedMembers,
    });
  } catch (error) {
    console.error("Error occurred:", error);
    return res.status(500).send("Internal Server Error");
  }
});



groupRoutes.put("/:_id", async (req, res) => {
  const groupId = req.params._id;
  const {
    groupName,
    userId,
    groupLogo,
    groupPicture,
    members,
    createdAt,
    category,
    groupType,
    isUserAdded,
  } = req.body;

  try {
    const groupToUpdate = {};
    if (groupName) groupToUpdate.groupName = groupName;
    if (userId) groupToUpdate.userId = userId;
    if (groupLogo) groupToUpdate.groupLogo = groupLogo;
    if (members) groupToUpdate.members = members;
    if (createdAt) groupToUpdate.createdAt = createdAt;
    if (category) groupToUpdate.category = category;
    if (groupType) groupToUpdate.groupType = groupType;
    if (groupPicture) groupToUpdate.groupPicture = groupPicture;
    if (isUserAdded) groupToUpdate.isUserAdded = isUserAdded;

    const updatedGroup = await Group.findByIdAndUpdate(groupId, groupToUpdate, {
      new: true,
    });

    res.json(updatedGroup);
  } catch (error) {
    console.error("Error updating group:", error);
    res.status(500).json({ message: "Error updating group" });
  }
});

groupRoutes.delete("/:_id", async (req, res) => {
  try {
    const groupId = req.params._id;

    const group = await Group.findByIdAndDelete(groupId);
    if (!group) {
      return res.status(400).send("Group not available");
    }

    const alumniToUpdate = await Alumni.find({ groupNames: groupId });

    const updatePromises = alumniToUpdate.map((alumni) => {
      const updatedGroupNames = alumni.groupNames.filter(
        (id) => id !== groupId
      );
      return Alumni.findByIdAndUpdate(
        alumni._id,
        { $set: { groupNames: updatedGroupNames } },
        { new: true }
      );
    });

    await Promise.all(updatePromises);

    res.json({ message: "Group deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting group" });
  }
});

groupRoutes.get("/", async (req, res) => {
  try {
    const { userId } = req.query;
    const page = parseInt(req.query.page);
    const size = parseInt(req.query.size);

    const skip = (page - 1) * size;

    const total = await Group.countDocuments({
      userId: { $ne: userId },
      "members.userId": { $ne: userId },
    });

    const groups = await Group.find({
      userId: { $ne: userId },
      "members.userId": { $ne: userId },
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(size);

    res.json({
      records: groups,
      total,
      page,
      size,
    });
  } catch (error) {
    console.error(error);
    res.status(400).json(error);
  }
});

groupRoutes.get("/:_id/members", async (req, res) => {
  try {
    const { _id } = req.params;

    const group = await Group.findById(_id);

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const members = group.members;

    res.status(200).json({ members: members, owner: group.userId });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

groupRoutes.get("/user/:_id", async (req, res) => {
  const userId = req.params._id;

  try {
    const groups = await Group.find({ userId });

    if (groups.length > 0) {
      res.status(200).json({ groups });
    } else {
      res.status(200).json({ message: "No groups found for this user." });
    }
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

groupRoutes.post("/createRequest", upload.single('businessVerification'),async (req, res) => {
  const { userId, groupId, ownerId, requestedUserName, groupName, ID } = req.body;
  let requested;

  try {
    if (ID) {
      
      const alumni = await Alumni.findOne({ _id: userId });

      
      if (!alumni) {
        return res.status(404).json({ error: "Alumni not found" });
      }

      
      const admin = await Alumni.findOne({ profileLevel: 1, department: alumni.department });

      
      if (!admin) {
        return res.status(404).json({ error: "Admin not found for the department" });
      }

      
      const newNotification = new Notification({
        userId,
        ID,
        ownerId: admin._id,
        requestedUserName,
        status: false,
      });
      await newNotification.save();
      requested = true;
      return res.status(201).json({ newNotification, requested });
    }
    if(req.file){
      const alumni = await Alumni.findOne({ _id: userId });

      
      if (!alumni) {
        return res.status(404).json({ error: "Alumni not found" });
      }

      
      const admin = await Alumni.findOne({ profileLevel: 0, department: "All" });

      
      if (!admin) {
        return res.status(404).json({ error: "Admin not found for the department" });
      }

      
      const newNotification = new Notification({
        userId,
        businessVerification: req.file.filename,
        ownerId: admin._id,
        groupId,
        requestedUserName,
        status: false,
      });
      await newNotification.save();
      requested = true;
      return res.status(201).json({ newNotification, requested });
    }

    // For regular notification creation
    const existingNotification = await Notification.findOne({
      userId,
      groupId,
    });

    if (existingNotification) {
      await Notification.deleteOne({ userId, groupId });
      requested = false;
      return res.status(200).json({
        message: "Existing notification removed.",
        newNotification: null,
        requested,
      });
    } else {
      const newNotification = new Notification({
        userId,
        groupId,
        ownerId,
        requestedUserName,
        groupName,
        status: false,
      });
      await newNotification.save();
      requested = true;
      return res.status(201).json({ newNotification, requested });
    }
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});


groupRoutes.get("/requests/req", async (req, res) => {
  try {
    const requests = await Notification.find();
    res.status(201).json(requests);
  } catch (error) {
    return res.send(error);
  }
});

groupRoutes.get("/groups/:groupID/", async (req, res) => {
  try {
    const groupID = req.params.groupID;
    const size = parseInt(req.query.size) || 0; 
    const page = parseInt(req.query.page) || 1;

    // Fetch the paginated records and the total document count
    const { paginatedRecords, totalDocuments } = await mergeSortAndPaginate(page, size, groupID);

    // Return the records and the total document count
    res.json({
      records: paginatedRecords,
      total: totalDocuments,  // Now using the total count from mergeSortAndPaginate
      size,
      page,
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message });
  }
});


module.exports = groupRoutes;
