// routes/sponsorshipRoutes.js - Complete Enhanced Routes
const express = require('express');
const Sponsorship = require('../models/sponsorshipSchema');
const uploadv2 = require("../services/s3");
const Razorpay = require('razorpay');
const crypto = require('crypto');
const router = express.Router();

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_9biOcO86B9dZyQ',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'oUfVrcCHSIfajJDQgMIeKmSG'
});

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

// Create new sponsorship
router.post('/create', async (req, res) => {
  try {
    const {
      title, description, detailedDescription, category, sponsorshipType,
      amount, duration, sponsorName, sponsorEmail, sponsorPhone, sponsorWebsite,
      sponsorLogo, eventName, eventDate, eventLocation, expectedAudience,
      targetDemographic, benefits, deliverables, marketingReach, images,
      proposalDocument, priority, tags, expiresAt, ownerEmail, createdBy,
      fundingGoal
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
      verificationStatus: 'pending',
      fundingRaised: 0,
      fundingGoal: fundingGoal ? Number(fundingGoal) : Number(amount)
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

// Get single sponsorship for editing/viewing
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

// Like/Unlike sponsorship
router.patch('/:id/like', async (req, res) => {
  try {
    const { userId } = req.body;
    const sponsorship = await Sponsorship.findById(req.params.id);
    
    if (!sponsorship) {
      return res.status(404).json({ 
        success: false, 
        message: 'Sponsorship not found' 
      });
    }

    const userIdStr = String(userId);
    const likedByStrings = sponsorship.likedBy.map(id => String(id));
    const idx = likedByStrings.indexOf(userIdStr);
    
    let isLiked;
    if (idx === -1) {
      sponsorship.likedBy.push(userId);
      sponsorship.likes = (sponsorship.likes || 0) + 1;
      isLiked = true;
    } else {
      sponsorship.likedBy.splice(idx, 1);
      sponsorship.likes = Math.max((sponsorship.likes || 0) - 1, 0);
      isLiked = false;
    }
    
    await sponsorship.save();
    
    res.json({ 
      success: true, 
      likes: sponsorship.likes, 
      isLiked: isLiked,
      message: isLiked ? 'Sponsorship liked' : 'Sponsorship unliked'
    });

  } catch (error) {
    console.error('Toggle like error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update like status'
    });
  }
});

// Get like status for current user
router.get('/:id/like-status/:userId', async (req, res) => {
  try {
    const { id, userId } = req.params;
    const sponsorship = await Sponsorship.findById(id);
    
    if (!sponsorship) {
      return res.status(404).json({
        success: false,
        message: 'Sponsorship not found'
      });
    }

    const isLiked = sponsorship.likedBy.includes(userId);
    
    res.json({
      success: true,
      isLiked: isLiked,
      likes: sponsorship.likes || 0
    });

  } catch (error) {
    console.error('Get like status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get like status'
    });
  }
});

// Share sponsorship
router.patch('/:id/share', async (req, res) => {
  try {
    const sponsorship = await Sponsorship.findByIdAndUpdate(
      req.params.id,
      { $inc: { shares: 1 } },
      { new: true }
    );

    if (!sponsorship) {
      return res.status(404).json({
        success: false,
        message: 'Sponsorship not found'
      });
    }

    res.json({
      success: true,
      shares: sponsorship.shares,
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

// Add top-level comment
router.post('/:id/comments', async (req, res) => {
  try {
    const { userId, userName, userEmail, text } = req.body;
    const sponsorship = await Sponsorship.findById(req.params.id);
    
    if (!sponsorship) {
      return res.status(404).json({ 
        success: false, 
        message: 'Sponsorship not found' 
      });
    }

    sponsorship.comments.push({ 
      authorId: userId, 
      authorName: userName, 
      authorEmail: userEmail, 
      text 
    });
    
    await sponsorship.save();
    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add comment'
    });
  }
});

// Add reply to comment
router.post('/:id/comments/:commentId/reply', async (req, res) => {
  try {
    const { userId, userName, userEmail, text } = req.body;
    const sponsorship = await Sponsorship.findById(req.params.id);
    
    if (!sponsorship) {
      return res.status(404).json({ 
        success: false, 
        message: 'Sponsorship not found' 
      });
    }

    const parent = sponsorship.comments.id(req.params.commentId);
    if (!parent) {
      return res.status(404).json({ 
        success: false, 
        message: 'Comment not found' 
      });
    }

    sponsorship.comments.push({ 
      authorId: userId, 
      authorName: userName, 
      authorEmail: userEmail, 
      text, 
      parent: parent._id 
    });
    
    await sponsorship.save();
    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Add reply error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add reply'
    });
  }
});

// Get comments (nested)
router.get('/:id/comments', async (req, res) => {
  try {
    const sponsorship = await Sponsorship.findById(req.params.id).lean();
    
    if (!sponsorship) {
      return res.status(404).json({ 
        success: false, 
        message: 'Sponsorship not found' 
      });
    }

    const nest = (list, parent = null) => {
      const safeList = list || [];
      return safeList
        .filter(c => String(c.parent) === String(parent))
        .map(c => ({ ...c, replies: nest(list, c._id) }));
    };
    
    res.json({ 
      success: true, 
      comments: nest(sponsorship.comments) 
    });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch comments'
    });
  }
});

// Create Razorpay order for sponsorship donation
router.post('/:id/create-order', async (req, res) => {
  try {
    const { amount } = req.body;
    const sponsorshipId = req.params.id;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid amount'
      });
    }

    const sponsorship = await Sponsorship.findById(sponsorshipId);
    if (!sponsorship) {
      return res.status(404).json({
        success: false,
        message: 'Sponsorship not found'
      });
    }

    const rawReceipt = `receipt_${Date.now()}_${sponsorshipId}`;
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
      sponsorshipName: sponsorship.title
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

// Handle successful payment
router.post('/:id/payment-success', async (req, res) => {
  try {
    const { amount, razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;
    const sponsorshipId = req.params.id;

    // Verify signature
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
    const sponsorship = await Sponsorship.findByIdAndUpdate(
      sponsorshipId,
      { $inc: { fundingRaised: Number(amount) } },
      { new: true }
    );

    if (!sponsorship) {
      return res.status(404).json({
        success: false,
        message: 'Sponsorship not found'
      });
    }

    res.json({
      success: true,
      message: `Payment of ₹${amount.toLocaleString()} successful! Funding updated.`,
      sponsorship: sponsorship,
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

// Update funding raised amount (for admin only)
router.patch('/:id/funding', async (req, res) => {
  try {
    const { operation, amount } = req.body;
    
    if (!['add', 'remove'].includes(operation)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid operation. Use "add" or "remove"'
      });
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be a positive number'
      });
    }

    const sponsorship = await Sponsorship.findById(req.params.id);
    
    if (!sponsorship) {
      return res.status(404).json({
        success: false,
        message: 'Sponsorship not found'
      });
    }

    let newFundingRaised = sponsorship.fundingRaised || 0;
    
    if (operation === 'add') {
      newFundingRaised += amount;
    } else if (operation === 'remove') {
      newFundingRaised -= amount;
      newFundingRaised = Math.max(0, newFundingRaised);
    }

    const updatedSponsorship = await Sponsorship.findByIdAndUpdate(
      req.params.id,
      { fundingRaised: newFundingRaised },
      { new: true }
    );

    res.json({
      success: true,
      message: `Successfully ${operation === 'add' ? 'added' : 'removed'} ₹${amount.toLocaleString()} ${operation === 'add' ? 'to' : 'from'} funding`,
      sponsorship: updatedSponsorship,
      operationDetails: {
        operation,
        amount,
        previousAmount: sponsorship.fundingRaised || 0,
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
