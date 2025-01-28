const express = require("express");
require("dotenv").config();
const Image = require("../models/image");
const { google } = require("googleapis");
const path = require("path");
const Notification = require("../models/notification");
const mongoose = require('mongoose');

const imageRoutes = express.Router();

const credentials = require("../credentials/alumni-portal-bhu-d2e996aefb6b.json");

const auth = new google.auth.GoogleAuth({
  keyFile: path.join(
    __dirname,
    "../credentials/alumni-portal-bhu-d2e996aefb6b.json"
  ), // Path to credentials file
  scopes: ["https://www.googleapis.com/auth/drive.readonly"],
});

const drive = google.drive({ version: "v3", auth });

const getImagesFromFolder = async (folderId) => {
  const images = [];

  try {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`,
      fields: "files(id, name, mimeType, webContentLink, webViewLink)",
    });

    if (res.data.files) {
      res.data.files.forEach((file) => {
        images.push({
          id: file.id,
          name: file.name,
          mimeType: file.mimeType,
          link: file.webContentLink,
          viewLink: file.webViewLink,
        });
      });
    }
  } catch (err) {
    console.error("Error fetching images from folder:", err);
    throw err;
  }

  return images;
};

imageRoutes.get("/getGoogleDriveFolders", async (req, res) => {
  try {
    const folders = await Image.find()
      .select("link date -_id") // Fetch only the `link` field
      .sort({ createdAt: -1 }); // Sort in descending order by `createdAt`
      const formattedFolders = folders.map((folder) => ({
        link: folder.link,
        date: folder.createdAt // Rename to `date`
      }));
  
      res.status(200).json({ folders: formattedFolders });

    // res.status(200).json({ folders: folders.map((folder) => folder.link) });
  } catch (err) {
    console.error("Error fetching Google Drive links:", err);
    res.status(500).json({ error: "Failed to fetch Google Drive links" });
  }
});

imageRoutes.post("/getImagesFromFolder", async (req, res) => {
    const { folderLink } = req.body;
  
    if (!folderLink) {
      return res.status(400).json({ error: "Folder link is required" });
    }
  
    // Extract folder ID from the Google Drive folder link
    const folderIdMatch = folderLink.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    if (!folderIdMatch || folderIdMatch.length < 2) {
      return res.status(400).json({ error: "Invalid Google Drive folder link" });
    }
  
    const folderId = folderIdMatch[1];
  
    try {
      const images = await getImagesFromFolder(folderId);
      res.status(200).json({ images });
    } catch (err) {
      console.error("Error fetching images:", err);
      res.status(500).json({ error: "Failed to fetch images from folder" });
    }
  });

imageRoutes.post('/addLink', async (req, res) => {
    const { notificationId, link, userId } = req.body;
  
    try {
      // 1. Add the link to the Image collection
      const newImage = new Image({
        link,
        addedBy: userId,
      });
      await newImage.save();
  
      // 2. Delete the notification from Notification collection
      const deletedNotification = await Notification.findByIdAndDelete(notificationId);
  
      if (!deletedNotification) {
        return res.status(404).json({ message: 'Notification not found' });
      }
  
      // Return success response
      res.status(200).json({ message: 'Link added and notification deleted successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error, please try again later' });
    }
  });  

module.exports = imageRoutes;
