const express = require("express");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const verifyToken = require("../utils");
const checkProfileLevel = require("../middleware/checkProfileLevel");
const Event = require("../models/Events");
const Alumni = require("../models/Alumni");
const Group = require("../models/group");
const nodemailer = require("nodemailer");

const eventRoutes = express.Router();

eventRoutes.get("/", async (req, res) => {
  try {
    const events = await Event.find();
    return res.json(events);
  } catch (error) {
    console.error(error);
    return res.status(500).send(error);
  }
});

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
    const istStartDate = new Date(start).toISOString();
    const istEndDate = new Date(end).toISOString();

    const alumni = await Alumni.find({});
    const emails = alumni.map((alum) => alum.email);

    const newEvent = new Event({
      userId,
      start: istStartDate,
      end: istEndDate,
      userName,
      profilePicture,
      title,
      description,
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
      location,
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
          message: "User not found.",
        });
      }
      const existingGroup = await Group.findOne({ groupName: title });

      if (existingGroup) {
        return res.status(400).json({
          message:
            "Event Group name already exists. Please choose a different name.",
        });
      }

      const newGroup = new Group({
        userId,
        groupName: title,
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
      await newEvent.save();
      console.log("new event id", newEvent._id);
    } else {
      await newEvent.save();
      console.log("new event id", newEvent._id);
    }
    // const transporter = nodemailer.createTransport({
    //   host: "smtp.gmail.com",
    //   port: 587,
    //   auth: {
    //     user: process.env.EMAIL_USER,
    //     pass: process.env.EMAIL_PASS,
    //   },
    // });

    // const message = {
    //   from: "nandannandu254@gmail.com",
    //   to: emails,
    //   subject: `Invitation to ${newEvent.title}`,
    //   text: `You have been invited to the ${newEvent.title} event in the Alumni Portal. Click on this link to see the event details: ${process.env.CLIENT_URL}/events/${newEvent._id}`,
    // };
    

    // transporter.sendMail(message, (err, info) => {
    //   if (err) {
    //     console.log("Error occurred. " + err.message);
    //   } else {
    //     console.log("Message sent: %s", info.messageId);
    //     console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
    //   }
    // });

    res.status(201).send(newEvent);
    console.log("new event id", newEvent._id);
  } catch (error) {
    console.error(error);
    return res.status(500).send(error);
  }
});

eventRoutes.put("/:_id", async (req, res) => {
  const updatedData = req.body;
  const { start, end, startTime, endTime, picture } = updatedData;

  try {
    const event = await Event.findById(req.params._id);

    if (!event) {
      console.error("No such event");
      return res.status(404).send("event not found");
    }

    const istStartDate = new Date(start).toISOString();
    const istEndDate = new Date(end).toISOString();
    updatedData.start = istStartDate;
    updatedData.end = istEndDate;

    Object.assign(event, updatedData);
    await event.save();

    return res.status(200).send("event updated successfully");
  } catch (error) {
    console.error("Error occurred:", error);
    return res.status(500).send("Internal Server Error");
  }
});

eventRoutes.delete("/:_id", async (req, res) => {
  const { _id } = req.params;
  const { groupName } = req.body;
  const alumni = await Alumni.find({});
  const emails = alumni.map((alum) => alum.email);

  try {
    const deletedEvent = await Event.findById(_id);
    const deletedEve = await Event.findOneAndDelete({ _id });

    if (!deletedEve) {
      console.error("No such Event");
      return res.status(404).send("Event not found");
    }
    if (groupName) {
      const deletedGroup = await Group.findOneAndDelete({
        groupName: groupName,
      });

      if (!deletedGroup) {
        console.error(`Group '${groupName}' not found`);
        return res.status(404).send("Group not found and could not be deleted");
      }
      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        auth: {
          user: "nandannandu254@gmail.com",
          pass: "hbpl hane patw qzqb",
        },
      });

      const message = {
        from: "nandannandu254@gmail.com",
        to: emails,
        subject: `${deletedEvent.title} cancelled`,
        text: `${deletedEvent.title} event has been cancelled`,
      };

      transporter.sendMail(message, (err, info) => {
        if (err) {
          console.log("Error occurred. " + err.message);
        } else {
          console.log("Message sent: %s", info.messageId);
          console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
        }
      });

      return res.status(200).send("Event and Group deleted successfully");
    }
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      auth: {
        user: "nandannandu254@gmail.com",
        pass: "hbpl hane patw qzqb",
      },
    });

    const message = {
      from: "nandannandu254@gmail.com",
      to: emails,
      subject: `${deletedEvent.title} cancelled`,
      text: `${deletedEvent.title} event has been cancelled`,
    };

    transporter.sendMail(message, (err, info) => {
      if (err) {
        console.log("Error occurred. " + err.message);
      } else {
        console.log("Message sent: %s", info.messageId);
        console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
      }
    });

    return res.status(200).send("Event deleted successfully");
  } catch (error) {
    console.error("Error occurred:", error);
    return res.status(500).send("Internal Server Error");
  }
});
eventRoutes.delete("/", async (req, res) => {
  try {
    await Event.deleteMany({});

    return res.status(200).send("All events deleted successfully");
  } catch (error) {
    console.error("Error occurred:", error);
    return res.status(500).send("Internal Server Error");
  }
});

eventRoutes.put("/attendEvent/:_id", async (req, res) => {
  const eventID = req.params._id;
  const { userId, userName, profilePicture, attendance, groupName,department,classNo,graduatingYear } = req.body;
  console.log("attendance", classNo,graduatingYear,department);

  try {
    const event = await Event.findById(eventID);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const userObject = { userId, userName, profilePicture,department,classNo,graduatingYear };

    const removeUserFromArray = (array) => {
      console.log("array remover", array);
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

    if (event.willAttend.some((user) => user.userId === userId)) {
      removeUserFromArray(event.willAttend);
    } else if (event.mightAttend.some((user) => user.userId === userId)) {
      removeUserFromArray(event.mightAttend);
    } else if (event.willNotAttend.some((user) => user.userId === userId)) {
      removeUserFromArray(event.willNotAttend);
    }

    if (attendance === 0) {
      addUserToArray(event.willAttend);
    } else if (attendance === 1) {
      addUserToArray(event.mightAttend);
    } else if (attendance === 2) {
      addUserToArray(event.willNotAttend);
      removeUserFromArray(event.willAttend);
      removeUserFromArray(event.mightAttend);
    } else {
      return res.status(400).json({ message: "Invalid attendance value" });
    }

    await event.save();

    if (groupName) {
      const group = await Group.findOne({ groupName: groupName });

      if (group) {
        const isMember = group.members.includes(userId);

        if (attendance === 0 || attendance === 1) {
          if (!isMember) {
            group.members.push(userId);
          }
        } else if (attendance === 2) {
          if (isMember) {
            group.members = group.members.filter((member) => member !== userId);
          }
        }

        await group.save();
      }
    }

    res.status(200).json({ message: "Attendance updated successfully", event });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "An error occurred", error });
  }
});

eventRoutes.get("/attendees/:_id", async (req, res) => {
  try {
    const eventID = req.params._id;
    const event = await Event.findById(
      eventID,
      "willAttend mightAttend willNotAttend"
    );

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.status(200).json({
      willAttend: event.willAttend,
      mightAttend: event.mightAttend,
      willNotAttend: event.willNotAttend,
    });
  } catch (error) {
    console.error("Error fetching attendees:", error);
    res.status(500).json({ message: "An error occurred", error });
  }
});

eventRoutes.get("/:_id", async (req, res) => {
  const eventID = req.params._id;

  try {
    const event = await Event.findById(eventID);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.status(200).json(event);
  } catch (error) {
    console.error("Error fetching event details:", error);
    res
      .status(500)
      .json({
        message: "An error occurred while fetching event details",
        error,
      });
  }
});

eventRoutes.put("/:_id/archive", async (req, res) => {
  const { _id } = req.params;

  try {
    // Find the post by ID
    const event = await Event.findById(_id);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (typeof event.archive === "undefined") {
      event.archive = true;
    } else {
      event.archive = !event.archive;
    }

    // Save the updated post
    await event.save();

    // Send the updated post back as a response
    res.status(200).json(event);
  } catch (error) {
    console.error("Error archiving/unarchiving post:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = eventRoutes;
