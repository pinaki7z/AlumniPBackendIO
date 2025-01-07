const express = require('express');
const searchRoutes = express.Router();
const Forum = require('../models/Forum');
const Alumni = require('../models/Alumni');
const Group = require('../models/group');
const Job = require('../models/job');
const Internship = require('../models/internship');
const Notification = require('../models/notification');
const Company = require('../models/company');

searchRoutes.get("/search", async (req, res) => {
    const keyword = req.query.keyword;

    try {
        const forumResults = await Forum.find({ title: { $regex: new RegExp(keyword, 'i') } });
        const alumniResults = await Alumni.find({ firstName: { $regex: new RegExp(keyword, 'i') } });
        const groupResults = await Group.find({ groupName: { $regex: new RegExp(keyword, 'i') } });
        const jobResults = await Job.find({
            $or: [
                { title: { $regex: new RegExp(keyword, 'i') } },
                { description: { $regex: new RegExp(keyword, 'i') } }
            ]
        });
        const internshipResults = await Internship.find({ title: { $regex: new RegExp(keyword, 'i') } });

        res.json({
            forum: forumResults,
            alumni: alumniResults,
            group: groupResults,
            job: jobResults,
            internship: internshipResults
        });
    } catch (error) {
        console.error("Error searching:", error);
        res.status(500).json({ error: "An error occurred while searching." });
    }
});

searchRoutes.get("/search/notifications", async (req, res) => {
    const keyword = req.query.keyword;

    try {
        const notifications = await Notification.find({
            requestedUserName: { $regex: new RegExp(keyword, "i") }
        });

        res.status(200).json(notifications);
    } catch (error) {
        console.error("Error searching notifications:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

searchRoutes.get("/search/company", async (req, res) => {
    const query = req.query.q; 

    try {
        const companies = await Company.find({
            $or: [
                { name: { $regex: new RegExp(query, 'i') } },
                { review: { $regex: new RegExp(query, 'i') } } 
            ]
        })
        .limit(7)

        res.status(200).json({ companies });
    } catch (error) {
        console.error("Error searching companies:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});



module.exports = searchRoutes;