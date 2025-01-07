const express = require("express");
const upload = require("../services/upload");

const uploadRoutes = express.Router();



uploadRoutes.post('/image', upload.array('images', 5), (req, res) => {
    if (!req.files) {
      return res.status(400).send('No files uploaded.');
    }
  
    // Create an array of file URLs
    const fileUrls = req.files.map(file => {
      return `${process.env.BACKEND_URL}/uploads/${file.filename}`;
    });
  
    // Return the array of URLs as a JSON response
    res.json( fileUrls );
  });
  uploadRoutes.post('/video', upload.single('video'), (req, res) => {
    if (!req.file) {
      return res.status(400).send('No video uploaded.');
    }

    const videoPath = `${process.env.BACKEND_URL}/uploads/${req.file.filename}`;
    const name = req.file.filename;

    // Return the video URL as a JSON response
    res.json({ videoPath, name });
  });

  uploadRoutes.post('/singleImage', upload.single('image'), (req, res) => {
    if (!req.file) {
      return res.status(400).send('No video uploaded.');
    }

    const urlPath = `${process.env.BACKEND_URL}/uploads/${req.file.filename}`;
    const name = req.file.filename;

    // Return the video URL as a JSON response
    res.json(urlPath);
  });
module.exports = uploadRoutes