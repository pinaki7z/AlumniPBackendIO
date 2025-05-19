const express = require('express');
const multer = require('multer');
const Year = require('../models/photoGallaryYear');
const Department = require('../models/photoGallaryDept');
const Images = require('../models/PhotoGalleryImage')
const uploadv2 = require("../services/s3");

const router = express.Router();


// Create Year
router.post('/years', async (req, res) => {
  try {
    const year = await Year.create({ year: req.body.year });
    res.status(201).json(year);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all Years
router.get('/years', async (req, res) => {
  const years = await Year.find().sort({ year: -1 });
  res.json(years);
});

// Create Department under a Year
router.post('/years/:yearId/departments', async (req, res) => {
  try {
    const dept = await Department.create({
      name: req.body.name,
      year: req.params.yearId
    });
    res.status(201).json(dept);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get Departments for a Year
router.get('/years/:yearId/departments', async (req, res) => {
  const deps = await Department.find({ year: req.params.yearId });
  res.json(deps);
});

// Get all images from yearID and department id
router.get('/years/:yearId/departments/:deptId/images', async (req, res) => {
  const images = await Images.find({
    year: req.params.yearId,
    department: req.params.deptId
  });
  res.json(images);
});

// Delete an image
router.delete('/images/:imageId/deleteImage', async (req, res) => {
  const { imageId } = req.params;

  try {
    const deletedImage = await Images.findByIdAndDelete(imageId);

    if (!deletedImage) {
      return res.status(404).json({ error: 'Image not found' });
    }

    res.status(200).json({ message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ error: 'Something went wrong while deleting image.' });
  }
});

// Upload multiple images (max 50) to S3 and save them to DB
router.post('/images/multipleImages/year/:yearId/dept/:deptId', uploadv2.array('images', 50), async (req, res) => {
  const { yearId, deptId } = req.params;

  // Validate inputs
  if (!yearId || !deptId) {
    return res.status(400).json({ error: 'yearId and deptId are required.' });
  }

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded.' });
  }

  try {
    // Prepare documents for insertion
    const imageDocs = req.files.map(file => ({
      yearId,
      deptId,
      imageUrl: file.location
    }));

    // Insert multiple documents at once
    const savedImages = await Images.insertMany(imageDocs);

    // Return the saved documents
    res.status(201).json(savedImages);
  } catch (error) {
    console.error('Error saving images:', error);
    res.status(500).json({ error: 'Something went wrong while saving images.' });
  }
});

router.get('/images/get/year/:yearId/dept/:deptId', async (req, res) => {
  const { deptId, yearId } = req.params;

  if (!deptId || !yearId) {
    return res.status(400).json({ error: 'deptId and yearId are required in query params.' });
  }

  try {
    const images = await Images.find({ deptId, yearId });


    res.status(200).json(images);
  } catch (error) {
    console.error('Error fetching images:', error);
    res.status(500).json({ error: 'Something went wrong while fetching images.' });
  }
});



module.exports = router;