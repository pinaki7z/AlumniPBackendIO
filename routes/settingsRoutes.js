const Settings = require("../models/setting");
const express = require("express");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const verifyToken = require("../utils");
const checkProfileLevel = require("../middleware/checkProfileLevel");
const multer = require("multer");
const path = require("path");

const settingsRoutes = express.Router();


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    // Rename file to prevent duplicates
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname)); // File name with extension
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only images are allowed"));
  }
};

const upload = multer({ storage: storage, fileFilter: fileFilter });

settingsRoutes.post("/createSetting", upload.single("category.logo"), async (req, res) => {
  try {
    const { brandName, brandColors, category } = req.body;

    const currentDate = new Date();
    const options = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      timeZone: "Asia/Kolkata",
    };

    const creationDate = currentDate.toLocaleString("en-IN", options);
    await Settings.deleteMany({});

    
    const logoFileName = req.file.filename;

   
    const newSetting = new Settings({
      brandName,
      brandColors,
      category: {
        name: category.name,
        logo: logoFileName,
      },
      updatedDate: creationDate,
    });

    
    const savedSetting = await newSetting.save();

    res.status(201).json(savedSetting);
  } catch (err) {
    res.status(500).json({ message: "Error creating setting", error: err.message });
  }
});

settingsRoutes.get("/:_id", async (req, res) => {
  try {
    const settings = await Settings.findById(req.params._id);

    if (!settings) {
      console.error("No such settings");
      return res.status(404).send("settings not found");
    }

    res.status(200).json(settings);
  } catch (err) {
    return res.status(400).send(err);
  }
});

settingsRoutes.put("/:_id", async (req, res) => {
  const settingId = req.params._id;
  const update = req.body;

  try {
    const currentDate = new Date();
    const options = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      timeZone: "Asia/Kolkata",
    };

    const creationDate = currentDate.toLocaleString("en-IN", options);
    const updatedSetting = await Settings.findOneAndUpdate(
      { _id: settingId },
      { $set: update, updatedDate: creationDate },
      { new: true, useFindAndModify: false }
    );

    if (!updatedSetting) {
      return res.status(404).json({ message: "Setting not found" });
    }
    await updatedSetting.save();
    res.json(updatedSetting);
  } catch (err) {
    res.status(500).json({ message: "Error updating setting" });
  }
});

settingsRoutes.delete("/", async (req, res) => {
  try {
    await Settings.deleteMany({});
    res.status(200).json({ message: "Settings deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred" });
  }
});

settingsRoutes.get("/", async (req, res) => {
  try {
    const settings = await Settings.find();

    if (!settings) {
      console.error("No settings");
      return res.status(404).send("settings not found");
    }

    res.status(200).json(settings);
  } catch (err) {
    return res.status(400).send(err);
  }
});

module.exports = settingsRoutes;
