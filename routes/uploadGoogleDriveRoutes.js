const express = require("express");
const Notification = require("../models/notification");
const Alumni = require("../models/Alumni");

const uploadGoogleDriveRoutes = express.Router();

uploadGoogleDriveRoutes.post('/', async (req, res) => {
    const { link, department, userId,requestedUserName } = req.body;

    try {
        // Find alumni with profileLevel === 1 in the specified department
        let owner = await Alumni.findOne({ department, profileLevel: 1 });

        // If no alumni with profileLevel === 1 is found, look for profileLevel === 0
        if (!owner) {
            owner = await Alumni.findOne({profileLevel: 0 });
        }

        // If no owner is found, return an error message
        if (!owner) {
            return res.status(404).json({ error: "No alumni found with profileLevel 1 or 0 in the specified department" });
        }

        const ownerId = owner.userId;

        // Create a new notification with the link, userId, ownerId, and status: false
        const newNotification = new Notification({
            link,
            userId,
            ownerId,
            status: false,
            requestedUserName
        });

        // Save the notification to the database
        await newNotification.save();

        res.status(201).json({ message: "Notification created successfully", notification: newNotification });
    } catch (error) {
        console.error("Error creating notification:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = uploadGoogleDriveRoutes;
