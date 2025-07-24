// routes/sponsorshipRoutes.js
const express = require('express');
const Sponsorship = require('../models/sponsorshipSchema');
const uploadv2 = require("../services/s3");
const router = express.Router();

// Upload sponsorship image
router.post('/upload-image', uploadv2.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No image uploaded.' 
      });
    }

    const imageUrl = req.file.location;
    res.json({ 
      success: true, 
      imageUrl: imageUrl 
    });
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to upload image' 
    });
  }
});

// Upload sponsorship document
router.post('/upload-document', uploadv2.single('document'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No document uploaded.' 
      });
    }

    const documentUrl = req.file.location;
    res.json({ 
      success: true, 
      documentUrl: documentUrl 
    });
  } catch (error) {
    console.error('Document upload error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to upload document' 
    });
  }
});

// Create new sponsorship
router.post('/create', async (req, res) => {
  try {
    const {
      title,
      description,
      detailedDescription,
      category,
      sponsorshipType,
      amount,
      duration,
      sponsorName,
      sponsorEmail,
      sponsorPhone,
      sponsorWebsite,
      sponsorLogo,
      eventName,
      eventDate,
      eventLocation,
      expectedAudience,
      targetDemographic,
      benefits,
      deliverables,
      marketingReach,
      images,
      proposalDocument,
      priority,
      tags,
      expiresAt
    } = req.body;

    // Validate required fields
    if (!title || !description || !category || !sponsorshipType || !amount || !sponsorName || !sponsorEmail) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Create new sponsorship
    const newSponsorship = new Sponsorship({
      title: title.trim(),
      description,
      detailedDescription,
      category,
      sponsorshipType,
      amount: Number(amount),
      duration,
      sponsorName: sponsorName.trim(),
      sponsorEmail: sponsorEmail.trim(),
      sponsorPhone,
      sponsorWebsite,
      sponsorLogo,
      eventName,
      eventDate: eventDate ? new Date(eventDate) : null,
      eventLocation,
      expectedAudience: expectedAudience ? Number(expectedAudience) : null,
      targetDemographic,
      benefits: benefits || [],
      deliverables: deliverables || [],
      marketingReach,
      images: images || [],
      proposalDocument,
      priority: priority || 'medium',
      tags: tags || [],
      expiresAt: expiresAt ? new Date(expiresAt) : null
    });

    const savedSponsorship = await newSponsorship.save();

    res.status(201).json({
      success: true,
      message: 'Sponsorship created successfully!',
      sponsorship: savedSponsorship
    });

  } catch (error) {
    console.error('Create sponsorship error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create sponsorship. Please try again.'
    });
  }
});

// Get all sponsorships
router.get('/all', async (req, res) => {
  try {
    const { status, category, page = 1, limit = 12, search, sortBy = 'createdAt' } = req.query;
    
    let query = {};
    
    // Filter by status
    if (status) {
      query.status = status;
    }
    
    // Filter by category
    if (category && category !== 'all') {
      query.category = category;
    }
    
    // Search functionality
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { sponsorName: { $regex: search, $options: 'i' } },
        { eventName: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    const sortOptions = {};
    sortOptions[sortBy] = -1;

    const sponsorships = await Sponsorship.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(Number(limit));

    const total = await Sponsorship.countDocuments(query);

    res.json({
      success: true,
      sponsorships,
      pagination: {
        current: Number(page),
        total: Math.ceil(total / limit),
        count: sponsorships.length,
        totalRecords: total
      }
    });

  } catch (error) {
    console.error('Get sponsorships error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sponsorships'
    });
  }
});

// Get single sponsorship by ID
router.get('/:id', async (req, res) => {
  try {
    const sponsorship = await Sponsorship.findById(req.params.id);
    
    if (!sponsorship) {
      return res.status(404).json({
        success: false,
        message: 'Sponsorship not found'
      });
    }

    // Increment view count
    sponsorship.views = (sponsorship.views || 0) + 1;
    await sponsorship.save();

    res.json({
      success: true,
      sponsorship
    });

  } catch (error) {
    console.error('Get sponsorship error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sponsorship'
    });
  }
});

// Update sponsorship
router.put('/:id', async (req, res) => {
  try {
    const sponsorship = await Sponsorship.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!sponsorship) {
      return res.status(404).json({
        success: false,
        message: 'Sponsorship not found'
      });
    }

    res.json({
      success: true,
      message: 'Sponsorship updated successfully',
      sponsorship
    });

  } catch (error) {
    console.error('Update sponsorship error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update sponsorship'
    });
  }
});

// Delete sponsorship
router.delete('/:id', async (req, res) => {
  try {
    const sponsorship = await Sponsorship.findByIdAndDelete(req.params.id);
    
    if (!sponsorship) {
      return res.status(404).json({
        success: false,
        message: 'Sponsorship not found'
      });
    }

    res.json({
      success: true,
      message: 'Sponsorship deleted successfully'
    });

  } catch (error) {
    console.error('Delete sponsorship error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete sponsorship'
    });
  }
});

// Get sponsorship statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const totalSponsorships = await Sponsorship.countDocuments();
    const activeSponsorships = await Sponsorship.countDocuments({ status: 'active' });
    const pendingSponsorships = await Sponsorship.countDocuments({ status: 'pending' });
    const completedSponsorships = await Sponsorship.countDocuments({ status: 'completed' });
    
    // Calculate total amount
    const totalAmountResult = await Sponsorship.aggregate([
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalAmount = totalAmountResult[0]?.total || 0;
    
    res.json({
      success: true,
      stats: {
        total: totalSponsorships,
        active: activeSponsorships,
        pending: pendingSponsorships,
        completed: completedSponsorships,
        totalAmount: totalAmount
      }
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics'
    });
  }
});

module.exports = router;
