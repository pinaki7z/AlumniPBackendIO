// routes/sponsorshipRoutes.js
const express = require('express');
const Sponsorship = require('../models/sponsorshipSchema');
const uploadv2 = require("../services/s3");
const router = express.Router();

// Image upload endpoint
router.post('/upload-image', uploadv2.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    res.json({
      success: true,
      message: 'Image uploaded successfully',
      imageUrl: req.file.location || req.file.path
    });
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload image'
    });
  }
});

// Document upload endpoint
router.post('/upload-document', uploadv2.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No document file provided'
      });
    }

    res.json({
      success: true,
      message: 'Document uploaded successfully',
      documentUrl: req.file.location || req.file.path
    });
  } catch (error) {
    console.error('Document upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload document'
    });
  }
});

// Create new sponsorship (goes to pending verification)
router.post('/create', async (req, res) => {
  try {
    const {
      title, description, detailedDescription, category, sponsorshipType,
      amount, duration, sponsorName, sponsorEmail, sponsorPhone, sponsorWebsite,
      sponsorLogo, eventName, eventDate, eventLocation, expectedAudience,
      targetDemographic, benefits, deliverables, marketingReach, images,
      proposalDocument, priority, tags, expiresAt, ownerEmail, createdBy
    } = req.body;

    if (!title || !description || !category || !sponsorshipType || !amount || !sponsorName || !sponsorEmail) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    const newSponsorship = new Sponsorship({
      title: title.trim(),
      description, detailedDescription, category, sponsorshipType,
      amount: Number(amount), duration,
      sponsorName: sponsorName.trim(),
      sponsorEmail: sponsorEmail.trim(),
      sponsorPhone, sponsorWebsite, sponsorLogo,
      ownerEmail: ownerEmail || sponsorEmail,
      createdBy: createdBy || sponsorName,
      eventName, eventDate: eventDate ? new Date(eventDate) : null,
      eventLocation, expectedAudience: expectedAudience ? Number(expectedAudience) : null,
      targetDemographic, benefits: benefits || [], deliverables: deliverables || [],
      marketingReach, images: images || [], proposalDocument,
      priority: priority || 'medium', tags: tags || [],
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      verificationStatus: 'pending'
    });

    const savedSponsorship = await newSponsorship.save();
    res.status(201).json({
      success: true,
      message: 'Sponsorship created and sent for admin verification!',
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

// Get sponsorships with filtering for different user types
router.get('/all', async (req, res) => {
  try {
    const { 
      status, category, page = 1, limit = 12, search, sortBy = 'createdAt',
      tab = 'verified', userEmail, isAdmin 
    } = req.query;
    
    let query = {};
    
    // Tab-based filtering
    switch (tab) {
      case 'verified':
        query.verificationStatus = 'verified';
        break;
      case 'my-sponsorships':
        if (userEmail) {
          query.ownerEmail = userEmail;
        }
        break;
      case 'pending':
        if (isAdmin === 'true') {
          query.verificationStatus = 'pending';
        }
        break;
      case 'rejected':
        if (isAdmin === 'true') {
          query.verificationStatus = 'rejected';
        }
        break;
      case 'all':
        if (isAdmin === 'true') {
          // Admin can see all
        } else {
          query.verificationStatus = 'verified';
        }
        break;
    }
    
    // Additional filters
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (category && category !== 'all') {
      query.category = category;
    }
    
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

// Get single sponsorship for editing
router.get('/:id', async (req, res) => {
  try {
    const sponsorship = await Sponsorship.findById(req.params.id);
    
    if (!sponsorship) {
      return res.status(404).json({
        success: false,
        message: 'Sponsorship not found'
      });
    }

    // Only increment views if not editing
    if (req.query.edit !== 'true') {
      sponsorship.views = (sponsorship.views || 0) + 1;
      await sponsorship.save();
    }

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
      { 
        ...req.body, 
        updatedAt: new Date(),
        verificationStatus: 'pending' // Reset to pending after edit
      },
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
      message: 'Sponsorship updated and sent for re-verification!',
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

// Admin verify sponsorship
router.put('/:id/verify', async (req, res) => {
  try {
    const { action, rejectionReason, verifiedBy } = req.body; // action: 'approve' | 'reject'
    
    const updateData = {
      verificationStatus: action === 'approve' ? 'verified' : 'rejected',
      verificationDate: new Date(),
      verifiedBy: verifiedBy,
      updatedAt: new Date()
    };
    
    if (action === 'reject' && rejectionReason) {
      updateData.rejectionReason = rejectionReason;
    }

    const sponsorship = await Sponsorship.findByIdAndUpdate(
      req.params.id,
      updateData,
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
      message: `Sponsorship ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
      sponsorship
    });
  } catch (error) {
    console.error('Verify sponsorship error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify sponsorship'
    });
  }
});

// Bulk verify sponsorships (admin only)
router.put('/bulk/verify', async (req, res) => {
  try {
    const { sponsorshipIds, action, verifiedBy } = req.body;
    
    const updateData = {
      verificationStatus: action === 'approve' ? 'verified' : 'rejected',
      verificationDate: new Date(),
      verifiedBy: verifiedBy,
      updatedAt: new Date()
    };

    const result = await Sponsorship.updateMany(
      { _id: { $in: sponsorshipIds } },
      updateData
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} sponsorships ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Bulk verify error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify sponsorships'
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

// Get sponsorship statistics with verification status
router.get('/stats/overview', async (req, res) => {
  try {
    const { isAdmin, userEmail } = req.query;
    
    let baseQuery = {};
    if (!isAdmin || isAdmin === 'false') {
      baseQuery.verificationStatus = 'verified';
    }
    
    const totalSponsorships = await Sponsorship.countDocuments(baseQuery);
    const activeSponsorships = await Sponsorship.countDocuments({ 
      ...baseQuery, 
      status: 'active' 
    });
    const pendingSponsorships = await Sponsorship.countDocuments({ 
      verificationStatus: 'pending' 
    });
    const verifiedSponsorships = await Sponsorship.countDocuments({ 
      verificationStatus: 'verified' 
    });
    const rejectedSponsorships = await Sponsorship.countDocuments({ 
      verificationStatus: 'rejected' 
    });
    
    // User's own sponsorships
    const mySponsorships = userEmail ? await Sponsorship.countDocuments({ 
      ownerEmail: userEmail 
    }) : 0;
    
    // Calculate total amount for verified sponsorships
    const totalAmountResult = await Sponsorship.aggregate([
      { $match: { verificationStatus: 'verified' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalAmount = totalAmountResult[0]?.total || 0;
    
    res.json({
      success: true,
      stats: {
        total: totalSponsorships,
        active: activeSponsorships,
        pending: pendingSponsorships,
        verified: verifiedSponsorships,
        rejected: rejectedSponsorships,
        mySponsorships: mySponsorships,
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

// Get pending sponsorships for admin verification
router.get('/admin/pending', async (req, res) => {
  try {
    const { page = 1, limit = 10, search, category } = req.query;
    
    let query = { verificationStatus: 'pending' };
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { sponsorName: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (category && category !== 'all') {
      query.category = category;
    }
    
    const skip = (page - 1) * limit;
    
    const sponsorships = await Sponsorship.find(query)
      .sort({ createdAt: -1 })
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
    console.error('Get pending sponsorships error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending sponsorships'
    });
  }
});

module.exports = router;
