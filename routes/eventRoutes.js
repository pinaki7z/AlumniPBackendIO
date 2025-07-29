const express = require("express");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const verifyToken = require("../utils");
const checkProfileLevel = require("../middleware/checkProfileLevel");
const Event = require("../models/Events");
const Alumni = require("../models/Alumni");
const Group = require("../models/group");
const nodemailer = require("nodemailer");

// Import prohibited words filter
const { 
  filterProhibitedWords, 
  checkForProhibitedWords 
} = require("../utils/prohibitedWordsFilter");

const eventRoutes = express.Router();

// Get all events with pagination and filtering
eventRoutes.get("/", async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      filterType = 'all',
      filterDate,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    let query = { archive: { $ne: true } };
    
    // Search functionality
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by type
    if (filterType && filterType !== 'all') {
      const today = new Date();
      if (filterType === 'upcoming') {
        query.start = { $gte: today.toISOString() };
      } else if (filterType === 'past') {
        query.end = { $lt: today.toISOString() };
      } else if (filterType === 'free') {
        query.priceType = 'free';
      } else if (filterType === 'paid') {
        query.priceType = 'paid';
      }
    }

    // Filter by date
    if (filterDate) {
      const selectedDate = new Date(filterDate);
      const nextDay = new Date(selectedDate);
      nextDay.setDate(nextDay.getDate() + 1);
      
      query.start = {
        $gte: selectedDate.toISOString(),
        $lt: nextDay.toISOString()
      };
    }

    const pageNumber = Math.max(1, parseInt(page));
    const limitNumber = Math.min(50, Math.max(5, parseInt(limit)));
    const skip = (pageNumber - 1) * limitNumber;

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const events = await Event.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNumber)
      .populate('userId', 'firstName lastName profilePicture department graduatingYear classNo');

    const total = await Event.countDocuments(query);
    const totalPages = Math.ceil(total / limitNumber);

    res.json({
      success: true,
      events,
      pagination: {
        currentPage: pageNumber,
        totalPages,
        limit: limitNumber,
        total,
        hasNext: pageNumber < totalPages,
        hasPrev: pageNumber > 1,
        nextPage: pageNumber < totalPages ? pageNumber + 1 : null,
        prevPage: pageNumber > 1 ? pageNumber - 1 : null
      }
    });
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch events",
      error: error.message
    });
  }
});

// Create event with prohibited words filtering
eventRoutes.post("/createEvent", async (req, res) => {
  const {
    userId,
    userName,
    profilePicture,
    start,
    end,
    title,
    description,
    allDay,
    free,
    color,
    startTime,
    endTime,
    picture,
    priceType,
    currency,
    amount,
    department,
    groupEvent,
    groupId,
    cName,
    cNumber,
    cEmail,
    location,
    createGroup,
  } = req.body;

  try {
    // Filter prohibited words from text fields
    const filteredTitle = await filterProhibitedWords(title);
    const filteredDescription = await filterProhibitedWords(description || '');
    const filteredLocation = await filterProhibitedWords(location);

    // Log if prohibited words were found
    const titleCheck = await checkForProhibitedWords(title);
    const descCheck = await checkForProhibitedWords(description || '');
    const locationCheck = await checkForProhibitedWords(location);

    if (titleCheck.containsProhibited || descCheck.containsProhibited || locationCheck.containsProhibited) {
      console.log(`Prohibited words filtered in event by user ${userId}:`, {
        title: titleCheck.foundWords,
        description: descCheck.foundWords,
        location: locationCheck.foundWords
      });
    }

    const istStartDate = new Date(start).toISOString();
    const istEndDate = new Date(end).toISOString();

    const newEvent = new Event({
      userId,
      start: istStartDate,
      end: istEndDate,
      userName,
      profilePicture,
      title: filteredTitle,
      description: filteredDescription,
      allDay,
      free,
      color,
      groupEvent,
      groupId,
      type: "event",
      startTime,
      endTime,
      picture,
      department,
      cName,
      cNumber,
      cEmail,
      location: filteredLocation,
      createGroup,
      priceType,
      currency,
      amount,
      archive: false,
      createdAt: new Date(),
    });

    if (createGroup) {
      const user = await Alumni.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found.",
        });
      }

      const existingGroup = await Group.findOne({ groupName: filteredTitle });

      if (existingGroup) {
        return res.status(400).json({
          success: false,
          message: "Event Group name already exists. Please choose a different name.",
        });
      }

      const newGroup = new Group({
        userId,
        groupName: filteredTitle,
        createdAt: new Date(),
        members: [
          {
            userId: user._id,
            profilePicture: user.profilePicture,
            userName: `${user.firstName} ${user.lastName}`,
            profileLevel: user.profileLevel,
          },
        ],
        groupType: "Private",
        category: "Event",
        businessConnect: false,
        department: "All",
      });

      await Alumni.updateMany(
        { _id: { $in: userId } },
        { $addToSet: { groupNames: newGroup._id } }
      );

      await newGroup.save();
    }

    await newEvent.save();

    res.status(201).json({
      success: true,
      message: "Event created successfully!",
      event: newEvent,
      filtered: (
        filteredTitle !== title ||
        filteredDescription !== (description || '') ||
        filteredLocation !== location
      )
    });
  } catch (error) {
    console.error("Error creating event:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create event",
      error: error.message
    });
  }
});

// Update event
eventRoutes.put("/:_id", async (req, res) => {
  const updatedData = req.body;
  const { start, end, title, description, location } = updatedData;

  try {
    const event = await Event.findById(req.params._id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    // Filter prohibited words if text fields are being updated
    if (title) {
      updatedData.title = await filterProhibitedWords(title);
    }
    if (description) {
      updatedData.description = await filterProhibitedWords(description);
    }
    if (location) {
      updatedData.location = await filterProhibitedWords(location);
    }

    const istStartDate = new Date(start).toISOString();
    const istEndDate = new Date(end).toISOString();
    updatedData.start = istStartDate;
    updatedData.end = istEndDate;
    updatedData.updatedAt = new Date();

    Object.assign(event, updatedData);
    await event.save();

    res.status(200).json({
      success: true,
      message: "Event updated successfully",
      event
    });
  } catch (error) {
    console.error("Error updating event:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update event",
      error: error.message
    });
  }
});

// Delete event
eventRoutes.delete("/:_id", async (req, res) => {
  const { _id } = req.params;
  const { groupName } = req.body;

  try {
    const deletedEvent = await Event.findById(_id);
    const deletedEve = await Event.findOneAndDelete({ _id });

    if (!deletedEve) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    if (groupName) {
      const deletedGroup = await Group.findOneAndDelete({
        groupName: groupName,
      });

      if (!deletedGroup) {
        console.error(`Group '${groupName}' not found`);
        return res.status(404).json({
          success: false,
          message: "Group not found and could not be deleted"
        });
      }
    }

    res.status(200).json({
      success: true,
      message: "Event deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting event:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete event",
      error: error.message
    });
  }
});

// Like/Unlike event
eventRoutes.post("/:_id/like", async (req, res) => {
  try {
    const { _id } = req.params;
    const { userId, userName, profilePicture } = req.body;

    const event = await Event.findById(_id);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    const isLiked = event.likes.some(like => like.userId === userId);

    if (isLiked) {
      // Unlike
      event.likes = event.likes.filter(like => like.userId !== userId);
    } else {
      // Like
      event.likes.push({ userId, userName, profilePicture });
    }

    await event.save();

    res.status(200).json({
      success: true,
      message: isLiked ? "Event unliked" : "Event liked",
      event,
      isLiked: !isLiked
    });
  } catch (error) {
    console.error("Error liking event:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update like",
      error: error.message
    });
  }
});

// Add comment to event with prohibited words filtering
eventRoutes.post("/:_id/comments", async (req, res) => {
  try {
    const { _id } = req.params;
    const { userId, content, userName, parentCommentId, profilePicture } = req.body;

    const event = await Event.findById(_id);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    // Filter prohibited words from comment content
    const filteredContent = await filterProhibitedWords(content);
    
    // Log if prohibited words were found
    const prohibitedCheck = await checkForProhibitedWords(content);
    if (prohibitedCheck.containsProhibited) {
      console.log(`Prohibited words filtered in event comment by user ${userId}:`, prohibitedCheck.foundWords);
    }

    const newComment = { 
      userId, 
      content: filteredContent, 
      userName, 
      profilePicture,
      createdAt: new Date()
    };

    // Recursive function to find comment by ID
    const findCommentById = (commentId, commentsArray) => {
      for (const comment of commentsArray) {
        if (comment._id.equals(commentId)) {
          return comment;
        }
        if (comment.comments && comment.comments.length > 0) {
          const foundComment = findCommentById(commentId, comment.comments);
          if (foundComment) {
            return foundComment;
          }
        }
      }
      return null;
    };

    if (parentCommentId === null || !parentCommentId) {
      // Add as top-level comment
      event.comments.push(newComment);
    } else {
      // Add as reply to existing comment
      const parentComment = findCommentById(parentCommentId, event.comments);
      if (!parentComment) {
        return res.status(404).json({
          success: false,
          message: "Parent comment not found"
        });
      }
      if (!parentComment.comments) {
        parentComment.comments = [];
      }
      parentComment.comments.push(newComment);
    }

    const updatedEvent = await event.save();

    res.status(200).json({
      success: true,
      message: "Comment added successfully",
      event: updatedEvent,
      filtered: filteredContent !== content
    });
  } catch (error) {
    console.error("Error adding comment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add comment",
      error: error.message
    });
  }
});

// Attendance management
eventRoutes.put("/attendEvent/:_id", async (req, res) => {
  const eventID = req.params._id;
  const { userId, userName, profilePicture, attendance, groupName, department, classNo, graduatingYear } = req.body;

  try {
    const event = await Event.findById(eventID);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    const userObject = { userId, userName, profilePicture, department, classNo, graduatingYear };

    const removeUserFromArray = (array) => {
      const index = array.findIndex((user) => user.userId === userId);
      if (index !== -1) {
        array.splice(index, 1);
      }
    };

    const addUserToArray = (array) => {
      if (!array.some((user) => user.userId === userId)) {
        array.push(userObject);
      }
    };

    // Remove user from all arrays first
    removeUserFromArray(event.willAttend);
    removeUserFromArray(event.mightAttend);
    removeUserFromArray(event.willNotAttend);

    // Add to appropriate array based on attendance
    if (attendance === 0) {
      addUserToArray(event.willAttend);
    } else if (attendance === 1) {
      addUserToArray(event.mightAttend);
    } else if (attendance === 2) {
      addUserToArray(event.willNotAttend);
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid attendance value"
      });
    }

    await event.save();

    // Handle group membership if applicable
    if (groupName) {
      const group = await Group.findOne({ groupName: groupName });

      if (group) {
        const isMember = group.members.some(member => member.userId === userId);

        if (attendance === 0 || attendance === 1) {
          if (!isMember) {
            group.members.push({
              userId,
              profilePicture,
              userName,
              profileLevel: 2
            });
          }
        } else if (attendance === 2) {
          if (isMember) {
            group.members = group.members.filter((member) => member.userId !== userId);
          }
        }

        await group.save();
      }
    }

    res.status(200).json({
      success: true,
      message: "Attendance updated successfully",
      event
    });
  } catch (error) {
    console.error("Error updating attendance:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update attendance",
      error: error.message
    });
  }
});

// Get event attendees
eventRoutes.get("/attendees/:_id", async (req, res) => {
  try {
    const eventID = req.params._id;
    const event = await Event.findById(
      eventID,
      "willAttend mightAttend willNotAttend"
    );

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    res.status(200).json({
      success: true,
      willAttend: event.willAttend,
      mightAttend: event.mightAttend,
      willNotAttend: event.willNotAttend,
    });
  } catch (error) {
    console.error("Error fetching attendees:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch attendees",
      error: error.message
    });
  }
});

// Get single event
eventRoutes.get("/:_id", async (req, res) => {
  const eventID = req.params._id;

  try {
    const event = await Event.findById(eventID)
      .populate('userId', 'firstName lastName profilePicture department graduatingYear classNo');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    res.status(200).json({
      success: true,
      event
    });
  } catch (error) {
    console.error("Error fetching event details:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch event details",
      error: error.message
    });
  }
});

// Archive/Unarchive event
eventRoutes.put("/:_id/archive", async (req, res) => {
  const { _id } = req.params;

  try {
    const event = await Event.findById(_id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    if (typeof event.archive === "undefined") {
      event.archive = true;
    } else {
      event.archive = !event.archive;
    }

    await event.save();

    res.status(200).json({
      success: true,
      message: `Event ${event.archive ? 'archived' : 'unarchived'} successfully`,
      event
    });
  } catch (error) {
    console.error("Error archiving/unarchiving event:", error);
    res.status(500).json({
      success: false,
      message: "Failed to archive/unarchive event",
      error: error.message
    });
  }
});

// Delete all events (admin only)
eventRoutes.delete("/", async (req, res) => {
  try {
    await Event.deleteMany({});

    res.status(200).json({
      success: true,
      message: "All events deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting all events:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete all events",
      error: error.message
    });
  }
});

module.exports = eventRoutes;
