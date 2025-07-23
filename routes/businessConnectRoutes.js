// businessRoutes.js
const express = require('express');
const Business = require('../models/businessSchema');
const Razorpay = require('razorpay');

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






// Update the existing like route to handle proper toggle
router.patch('/:id/like', async (req, res) => {
  try {
    const { userId } = req.body;
    const business = await Business.findById(req.params.id);
    
    if (!business) {
      return res.status(404).json({ 
        success: false, 
        message: 'Business not found' 
      });
    }

    const userIdStr = String(userId);
    const likedByStrings = business.likedBy.map(id => String(id));
    const idx = likedByStrings.indexOf(userIdStr);
    
    let isLiked;
    if (idx === -1) {
      // User hasn't liked, so add like
      business.likedBy.push(userId);
      business.likes = (business.likes || 0) + 1;
      isLiked = true;
    } else {
      // User has liked, so remove like
      business.likedBy.splice(idx, 1);
      business.likes = Math.max((business.likes || 0) - 1, 0);
      isLiked = false;
    }
    
    await business.save();
    
    res.json({ 
      success: true, 
      likes: business.likes, 
      isLiked: isLiked,
      message: isLiked ? 'Business liked' : 'Business unliked'
    });

  } catch (error) {
    console.error('Toggle like error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update like status'
    });
  }
});
// add top-level comment
router.post('/:id/comments', async (req, res) => {
  const { userId, userName, userEmail, text } = req.body;
  const biz = await Business.findById(req.params.id);
  if (!biz) return res.status(404).json({ success:false, message:'Business not found' });

  biz.comments.push({ authorId:userId, authorName:userName, authorEmail:userEmail, text });
  await biz.save();
  res.status(201).json({ success:true });
});

// add reply
router.post('/:id/comments/:commentId/reply', async (req, res) => {
  const { userId, userName, userEmail, text } = req.body;
  const biz = await Business.findById(req.params.id);
  if (!biz) return res.status(404).json({ success:false, message:'Business not found' });

  const parent = biz.comments.id(req.params.commentId);
  if (!parent) return res.status(404).json({ success:false, message:'Comment not found' });

  biz.comments.push({ authorId:userId, authorName:userName, authorEmail:userEmail, text, parent: parent._id });
  await biz.save();
  res.status(201).json({ success:true });
});

// get comments (nested)
router.get('/:id/comments', async (req, res) => {
  const biz = await Business.findById(req.params.id).lean();
  if (!biz) return res.status(404).json({ success:false, message:'Business not found' });

  const nest = (list, parent = null) =>{

    const safeList = list || [];
    return safeList.filter(c => String(c.parent) === String(parent)).map(c => ({ ...c, replies: nest(list, c._id) }));

  }
  res.json({ success:true, comments: nest(biz.comments) });

});


// Get like status for current user
router.get('/:id/like-status/:userId', async (req, res) => {
  try {
    const { id, userId } = req.params;
    const business = await Business.findById(id);
    
    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    const isLiked = business.likedBy.includes(userId);
    
    res.json({
      success: true,
      isLiked: isLiked,
      likes: business.likes || 0
    });

  } catch (error) {
    console.error('Get like status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get like status'
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




// Razorpay payment verification and funding update
// Backend route: /api/business/:id/payment-success
router.post('/:id/payment-success', async (req, res) => {
  try {
    const { amount, razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;
    const businessId = req.params.id;

    // Validate required fields
    if (!razorpayPaymentId || !razorpayOrderId || !razorpaySignature || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Missing required payment details'
      });
    }

    // Verify signature using Razorpay SDK (recommended)
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'oUfVrcCHSIfajJDQgMIeKmSG')
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature'
      });
    }

    // Update funding raised
    const business = await Business.findByIdAndUpdate(
      businessId,
      { 
        $inc: { fundingRaised: Number(amount) }
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
      message: `Payment of ₹${amount.toLocaleString()} successful! Funding updated.`,
      business: business,
      paymentDetails: {
        paymentId: razorpayPaymentId,
        orderId: razorpayOrderId,
        amount: amount
      }
    });

  } catch (error) {
    console.error('Payment success error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process payment success'
    });
  }
});
// Create Razorpay order
// Backend route: /api/business/:id/create-order
router.post('/:id/create-order', async (req, res) => {
  try {
    const { amount } = req.body;
    const businessId = req.params.id;

    // Validate inputs
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid amount'
      });
    }

    const business = await Business.findById(businessId);
    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    // If using actual Razorpay SDK (recommended)
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID ||'rzp_test_9biOcO86B9dZyQ',
      key_secret: process.env.RAZORPAY_KEY_SECRET || 'oUfVrcCHSIfajJDQgMIeKmSG'
    });

  const rawReceipt = `receipt_${Date.now()}_${businessId}`;
const receipt = rawReceipt.slice(0, 40);

const options = {
  amount: amount * 100,
  currency: 'INR',
  receipt,
  payment_capture: 1
};
    const order = await razorpay.orders.create(options);
    
    res.json({
      success: true,
      orderId: order.id,
      amount: amount,
      currency: 'INR',
      businessName: business.businessName
    });

  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: error.message
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
