const express = require("express");
const upload = require("../services/upload");
const uploadv2 = require("../services/s3");

const uploadRoutes = express.Router();


// UPDATED S3 BUCKET ROUTES 

// Upload multiple images (max 5) to S3
uploadRoutes.post('/image', uploadv2.array('images', 5), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).send('No files uploaded.');
  }

  // Extract file URLs from the uploaded files
  const fileUrls = req.files.map(file => file.location);

  // Return the array of URLs as a JSON response
  res.json(fileUrls);
});

// Upload a single video to S3
uploadRoutes.post('/video', uploadv2.single('video'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No video uploaded.');
  }

  const videoUrl = req.file.location;
  const name = req.file.key;  // The S3 object key including timestamp and original name

  // Return the video URL and file name as a JSON response
  res.json({ videoUrl, name });
});

// Upload a single image to S3
uploadRoutes.post('/singleImage', uploadv2.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No image uploaded.');
  }

  const imageUrl = req.file.location;

  // Return the image URL as a JSON response
  res.json({ imageUrl });
});

module.exports = uploadRoutes;

// BELOW IS THE NORMAL UPLOAD FUNCTION 


// uploadRoutes.post('/image', upload.array('images', 5), (req, res) => {
//     if (!req.files) {
//       return res.status(400).send('No files uploaded.');
//     }
  
//     // Create an array of file URLs
//     const fileUrls = req.files.map(file => {
//       return `${process.env.BACKEND_URL}/uploads/${file.filename}`;
//     });
  
//     // Return the array of URLs as a JSON response
//     res.json( fileUrls );
//   });
//   uploadRoutes.post('/video', upload.single('video'), (req, res) => {
//     if (!req.file) {
//       return res.status(400).send('No video uploaded.');
//     }

//     const videoPath = `${process.env.BACKEND_URL}/uploads/${req.file.filename}`;
//     const name = req.file.filename;

//     // Return the video URL as a JSON response
//     res.json({ videoPath, name });
//   });

//   uploadRoutes.post('/singleImage', upload.single('image'), (req, res) => {
//     if (!req.file) {
//       return res.status(400).send('No video uploaded.');
//     }

//     const urlPath = `${process.env.BACKEND_URL}/uploads/${req.file.filename}`;
//     const name = req.file.filename;

//     // Return the video URL as a JSON response
//     res.json(urlPath);
//   });
// module.exports = uploadRoutes