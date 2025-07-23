// businessRoutes.js
const express = require('express');
const Business = require('../models/businessSchema');
const uploadv2 = require("../services/s3");
const router = express.Router();

// Upload background image
router.post('/upload-background-image', uploadv2.single('backgroundImage'), (req, res) => {
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

// Upload business plan PDF
router.post('/upload-business-plan', uploadv2.single('businessPlan'), (req, res) => {
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

// Create new business
router.post('/create', async (req, res) => {
  try {
    const {
      ownerName,
      ownerEmail,
      ownerPhone,
      businessName,
      industry,
      description,
      targetMarket,
      investmentAmount,
      currentRevenue,
      fundingGoal,
      competitiveAdvantage,
      teamExperience,
      marketingStrategy,
      businessPlan,
      backgroundImage
    } = req.body;

    // Validate required fields
    if (!ownerName || !ownerEmail || !businessName || !industry || !description) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Create new business
    const newBusiness = new Business({
      businessName: businessName.trim(),
      industry,
      description,
      targetMarket,
      investmentAmount: Number(investmentAmount) || 0,
      currentRevenue: Number(currentRevenue) || 0,
      fundingGoal: Number(fundingGoal) || 0,
      competitiveAdvantage,
      teamExperience,
      marketingStrategy,
      ownerName: ownerName.trim(),
      ownerEmail: ownerEmail.trim(),
      ownerPhone,
      backgroundImage,
      businessPlan,
      status: 'pending',
      createdAt: new Date()
    });

    const savedBusiness = await newBusiness.save();

    res.status(201).json({
      success: true,
      message: 'Business submitted for verification successfully!',
      business: savedBusiness
    });

  } catch (error) {
    console.error('Create business error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create business. Please try again.'
    });
  }
});

// Get all businesses (for listing)
router.get('/all', async (req, res) => {
  try {
    const { status, page = 1, limit = 50, search, industry } = req.query;
    
    let query = {};
    
    // Filter by status if provided
    if (status) {
      query.status = status;
    }
    
    // Search functionality
    if (search) {
      query.$or = [
        { businessName: { $regex: search, $options: 'i' } },
        { industry: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Filter by industry
    if (industry && industry !== 'all') {
      query.industry = industry;
    }

    const skip = (page - 1) * limit;

    const businesses = await Business.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Business.countDocuments(query);

    res.json({
      success: true,
      businesses,
      pagination: {
        current: Number(page),
        total: Math.ceil(total / limit),
        count: businesses.length,
        totalRecords: total
      }
    });

  } catch (error) {
    console.error('Get businesses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch businesses'
    });
  }
});

// Get businesses by owner email (for "My Businesses")
router.get('/my/:ownerEmail', async (req, res) => {
  try {
    const { ownerEmail } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    const query = { ownerEmail };
    const skip = (page - 1) * limit;

    const businesses = await Business.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Business.countDocuments(query);

    res.json({
      success: true,
      businesses,
      pagination: {
        current: Number(page),
        total: Math.ceil(total / limit),
        count: businesses.length,
        totalRecords: total
      }
    });

  } catch (error) {
    console.error('Get my businesses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your businesses'
    });
  }
});

// Get statistics for dashboard
router.get('/stats/overview', async (req, res) => {
  try {
    const totalBusinesses = await Business.countDocuments({ status: 'verified' });
    const pendingBusinesses = await Business.countDocuments({ status: 'pending' });
    const rejectedBusinesses = await Business.countDocuments({ status: 'rejected' });
    
    // Get unique industries
    const industries = await Business.distinct('industry');
    
    res.json({
      success: true,
      stats: {
        total: totalBusinesses,
        pending: pendingBusinesses,
        rejected: rejectedBusinesses,
        industries: industries.length
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

// Get single business by ID
router.get('/:id', async (req, res) => {
  try {
    const business = await Business.findById(req.params.id);
    
    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    res.json({
      success: true,
      business
    });

  } catch (error) {
    console.error('Get business error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch business'
    });
  }
});

// Update business status (for admin)
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['pending', 'verified', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const business = await Business.findByIdAndUpdate(
      req.params.id,
      { 
        status,
        verifiedAt: status === 'verified' ? new Date() : null
      },
      { new: true }
    );

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    res.json({
      success: true,
      message: `Business ${status} successfully`,
      business
    });

  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update business status'
    });
  }
});

// Delete business (for admin or owner)
router.delete('/:id', async (req, res) => {
  try {
    const business = await Business.findByIdAndDelete(req.params.id);
    
    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    res.json({
      success: true,
      message: 'Business deleted successfully'
    });

  } catch (error) {
    console.error('Delete business error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete business'
    });
  }
});



// Get admin verification statistics
router.get('/stats/admin', async (req, res) => {
  try {
    const pendingCount = await Business.countDocuments({ status: 'pending' });
    
    // Get today's approved businesses
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const approvedToday = await Business.countDocuments({
      status: 'verified',
      verifiedAt: {
        $gte: today,
        $lt: tomorrow
      }
    });
    
    // Total reviewed (verified + rejected)
    const totalReviewed = await Business.countDocuments({
      status: { $in: ['verified', 'rejected'] }
    });

    res.json({
      success: true,
      stats: {
        pending: pendingCount,
        approvedToday: approvedToday,
        totalReviewed: totalReviewed
      }
    });

  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin statistics'
    });
  }
});





// Update business likes
router.patch('/:id/like', async (req, res) => {
  try {
    const { action } = req.body; // 'like' or 'unlike'
    
    const business = await Business.findById(req.params.id);
    
    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    if (action === 'like') {
      business.likes = (business.likes || 0) + 1;
    } else if (action === 'unlike' && business.likes > 0) {
      business.likes = business.likes - 1;
    }

    await business.save();

    res.json({
      success: true,
      likes: business.likes,
      message: action === 'like' ? 'Business liked' : 'Business unliked'
    });

  } catch (error) {
    console.error('Update likes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update likes'
    });
  }
});

// Update business shares count
router.patch('/:id/share', async (req, res) => {
  try {
    const business = await Business.findByIdAndUpdate(
      req.params.id,
      { $inc: { shares: 1 } },
      { new: true }
    );

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    res.json({
      success: true,
      shares: business.shares,
      message: 'Share count updated'
    });

  } catch (error) {
    console.error('Update shares error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update shares'
    });
  }
});

// Get business plan download URL
router.get('/:id/download-business-plan', async (req, res) => {
  try {
    const business = await Business.findById(req.params.id);
    
    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    if (!business.businessPlan) {
      return res.status(404).json({
        success: false,
        message: 'Business plan not available'
      });
    }

    res.json({
      success: true,
      downloadUrl: business.businessPlan,
      fileName: `${business.businessName}_business_plan.pdf`
    });

  } catch (error) {
    console.error('Get business plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get business plan'
    });
  }
});



// Update existing business
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      ownerName,
      ownerEmail,
      ownerPhone,
      businessName,
      industry,
      description,
      targetMarket,
      investmentAmount,
      currentRevenue,
      fundingGoal,
      competitiveAdvantage,
      teamExperience,
      marketingStrategy,
      businessPlan,
      backgroundImage
    } = req.body;

    // Validate required fields
    if (!ownerName || !ownerEmail || !businessName || !industry || !description) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Check if business exists and verify ownership
    const existingBusiness = await Business.findById(id);
    
    if (!existingBusiness) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    // Update business data
    const updatedBusiness = await Business.findByIdAndUpdate(
      id,
      {
        businessName: businessName.trim(),
        industry,
        description,
        targetMarket,
        investmentAmount: Number(investmentAmount) || 0,
        currentRevenue: Number(currentRevenue) || 0,
        fundingGoal: Number(fundingGoal) || 0,
        competitiveAdvantage,
        teamExperience,
        marketingStrategy,
        ownerName: ownerName.trim(),
        ownerEmail: ownerEmail.trim(),
        ownerPhone,
        ...(backgroundImage && { backgroundImage }),
        ...(businessPlan && { businessPlan }),
        // Reset status to pending if business was previously rejected
        ...(existingBusiness.status === 'rejected' && { status: 'pending' })
      },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Business updated successfully!',
      business: updatedBusiness
    });

  } catch (error) {
    console.error('Update business error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update business. Please try again.'
    });
  }
});


// Update the existing /all route to handle multiple statuses
router.get('/all', async (req, res) => {
  try {
    const { status, page = 1, limit = 50, search, industry } = req.query;
    
    let query = {};
    
    // Handle multiple statuses (for Total Reviewed)
    if (status) {
      if (status.includes(',')) {
        // Multiple statuses separated by comma
        const statuses = status.split(',');
        query.status = { $in: statuses };
      } else {
        // Single status
        query.status = status;
      }
    }
    
    // Search functionality
    if (search) {
      query.$or = [
        { businessName: { $regex: search, $options: 'i' } },
        { industry: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Filter by industry
    if (industry && industry !== 'all') {
      query.industry = industry;
    }

    const skip = (page - 1) * limit;

    const businesses = await Business.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Business.countDocuments(query);

    res.json({
      success: true,
      businesses,
      pagination: {
        current: Number(page),
        total: Math.ceil(total / limit),
        count: businesses.length,
        totalRecords: total
      }
    });

  } catch (error) {
    console.error('Get businesses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch businesses'
    });
  }
});



// Update funding raised amount (for admin only)
router.patch('/:id/funding', async (req, res) => {
  try {
    const { operation, amount } = req.body; // operation: 'add' or 'remove', amount: number
    
    // Validate operation
    if (!['add', 'remove'].includes(operation)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid operation. Use "add" or "remove"'
      });
    }

    // Validate amount
    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be a positive number'
      });
    }

    const business = await Business.findById(req.params.id);
    
    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    // Calculate new funding amount
    let newFundingRaised = business.fundingRaised || 0;
    
    if (operation === 'add') {
      newFundingRaised += amount;
    } else if (operation === 'remove') {
      newFundingRaised -= amount;
      // Ensure funding doesn't go below 0
      newFundingRaised = Math.max(0, newFundingRaised);
    }

    // Update the business
    const updatedBusiness = await Business.findByIdAndUpdate(
      req.params.id,
      { fundingRaised: newFundingRaised },
      { new: true }
    );

    res.json({
      success: true,
      message: `Successfully ${operation === 'add' ? 'added' : 'removed'} ₹${amount.toLocaleString()} ${operation === 'add' ? 'to' : 'from'} funding`,
      business: updatedBusiness,
      operationDetails: {
        operation,
        amount,
        previousAmount: business.fundingRaised || 0,
        newAmount: newFundingRaised
      }
    });

  } catch (error) {
    console.error('Update funding error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update funding progress'
    });
  }
});

module.exports = router;
