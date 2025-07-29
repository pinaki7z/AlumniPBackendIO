// routes/prohibitedKeywordsRoutes.js
const express = require('express');
const ProhibitedKeyword = require('../models/prohibitedKeywordsSchema');
const router = express.Router();

// Get all prohibited keywords with filtering and pagination
router.get('/all', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, // Changed default to 10 for better pagination
      search, 
      category, 
      severity, 
      isActive 
    } = req.query;
    
    let query = {};
    
    // Search functionality
    if (search) {
      query.$or = [
        { keyword: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Filter by category
    if (category && category !== 'all') {
      query.category = category;
    }
    
    // Filter by severity
    if (severity && severity !== 'all') {
      query.severity = severity;
    }
    
    // Filter by active status
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const pageNumber = Math.max(1, parseInt(page));
    const limitNumber = Math.min(50, Math.max(5, parseInt(limit))); // Min 5, Max 50
    const skip = (pageNumber - 1) * limitNumber;

    const keywords = await ProhibitedKeyword.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber);

    const total = await ProhibitedKeyword.countDocuments(query);
    const totalPages = Math.ceil(total / limitNumber);

    res.json({
      success: true,
      keywords,
      pagination: {
        currentPage: pageNumber,
        totalPages,
        limit: limitNumber,
        total,
        hasNext: pageNumber < totalPages,
        hasPrev: pageNumber > 1,
        nextPage: pageNumber < totalPages ? pageNumber + 1 : null,
        prevPage: pageNumber > 1 ? pageNumber - 1 : null
      }
    });

  } catch (error) {
    console.error('Get prohibited keywords error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch prohibited keywords'
    });
  }
});

// Add new prohibited keyword
router.post('/create', async (req, res) => {
  try {
    const {
      keyword,
      category = 'other',
      severity = 'medium',
      addedBy,
      description
    } = req.body;

    // Validate required fields
    if (!keyword || !addedBy) {
      return res.status(400).json({
        success: false,
        message: 'Keyword and addedBy are required fields'
      });
    }

    // Check if keyword already exists
    const existingKeyword = await ProhibitedKeyword.findOne({ 
      keyword: keyword.toLowerCase().trim() 
    });

    if (existingKeyword) {
      return res.status(409).json({
        success: false,
        message: 'This keyword already exists in the prohibited list'
      });
    }

    // Create new prohibited keyword
    const newKeyword = new ProhibitedKeyword({
      keyword: keyword.toLowerCase().trim(),
      category,
      severity,
      addedBy: addedBy.trim(),
      description: description?.trim()
    });

    const savedKeyword = await newKeyword.save();

    res.status(201).json({
      success: true,
      message: 'Prohibited keyword added successfully!',
      keyword: savedKeyword
    });

  } catch (error) {
    console.error('Create prohibited keyword error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add prohibited keyword'
    });
  }
});

// Update prohibited keyword
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      keyword,
      category,
      severity,
      description,
      isActive
    } = req.body;

    // Check if keyword exists
    const existingKeyword = await ProhibitedKeyword.findById(id);
    
    if (!existingKeyword) {
      return res.status(404).json({
        success: false,
        message: 'Prohibited keyword not found'
      });
    }

    // If keyword is being changed, check for duplicates
    if (keyword && keyword.toLowerCase().trim() !== existingKeyword.keyword) {
      const duplicateKeyword = await ProhibitedKeyword.findOne({ 
        keyword: keyword.toLowerCase().trim(),
        _id: { $ne: id }
      });

      if (duplicateKeyword) {
        return res.status(409).json({
          success: false,
          message: 'This keyword already exists in the prohibited list'
        });
      }
    }

    // Update the keyword
    const updatedKeyword = await ProhibitedKeyword.findByIdAndUpdate(
      id,
      {
        ...(keyword && { keyword: keyword.toLowerCase().trim() }),
        ...(category && { category }),
        ...(severity && { severity }),
        ...(description !== undefined && { description: description?.trim() }),
        ...(isActive !== undefined && { isActive }),
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Prohibited keyword updated successfully!',
      keyword: updatedKeyword
    });

  } catch (error) {
    console.error('Update prohibited keyword error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update prohibited keyword'
    });
  }
});

// Delete prohibited keyword
router.delete('/:id', async (req, res) => {
  try {
    const keyword = await ProhibitedKeyword.findByIdAndDelete(req.params.id);
    
    if (!keyword) {
      return res.status(404).json({
        success: false,
        message: 'Prohibited keyword not found'
      });
    }

    res.json({
      success: true,
      message: 'Prohibited keyword deleted successfully'
    });

  } catch (error) {
    console.error('Delete prohibited keyword error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete prohibited keyword'
    });
  }
});

// Toggle active status
router.patch('/:id/toggle-status', async (req, res) => {
  try {
    const keyword = await ProhibitedKeyword.findById(req.params.id);
    
    if (!keyword) {
      return res.status(404).json({
        success: false,
        message: 'Prohibited keyword not found'
      });
    }

    keyword.isActive = !keyword.isActive;
    keyword.updatedAt = new Date();
    await keyword.save();

    res.json({
      success: true,
      message: `Keyword ${keyword.isActive ? 'activated' : 'deactivated'} successfully`,
      keyword
    });

  } catch (error) {
    console.error('Toggle status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update keyword status'
    });
  }
});

// Get statistics
router.get('/stats', async (req, res) => {
  try {
    const totalKeywords = await ProhibitedKeyword.countDocuments();
    const activeKeywords = await ProhibitedKeyword.countDocuments({ isActive: true });
    const inactiveKeywords = await ProhibitedKeyword.countDocuments({ isActive: false });
    
    // Get category breakdown
    const categoryStats = await ProhibitedKeyword.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // Get severity breakdown
    const severityStats = await ProhibitedKeyword.aggregate([
      { $group: { _id: '$severity', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      stats: {
        total: totalKeywords,
        active: activeKeywords,
        inactive: inactiveKeywords,
        categories: categoryStats,
        severities: severityStats
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

// Bulk import keywords
router.post('/bulk-import', async (req, res) => {
  try {
    const { keywords, addedBy, category = 'other', severity = 'medium' } = req.body;

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Keywords array is required'
      });
    }

    if (!addedBy) {
      return res.status(400).json({
        success: false,
        message: 'AddedBy field is required'
      });
    }

    const results = {
      added: [],
      skipped: [],
      errors: []
    };

    for (const keywordText of keywords) {
      try {
        const trimmedKeyword = keywordText.toLowerCase().trim();
        
        if (!trimmedKeyword) {
          results.skipped.push({ keyword: keywordText, reason: 'Empty keyword' });
          continue;
        }

        // Check if already exists
        const existing = await ProhibitedKeyword.findOne({ keyword: trimmedKeyword });
        if (existing) {
          results.skipped.push({ keyword: keywordText, reason: 'Already exists' });
          continue;
        }

        // Create new keyword
        const newKeyword = new ProhibitedKeyword({
          keyword: trimmedKeyword,
          category,
          severity,
          addedBy: addedBy.trim()
        });

        await newKeyword.save();
        results.added.push(trimmedKeyword);

      } catch (error) {
        results.errors.push({ keyword: keywordText, error: error.message });
      }
    }

    res.json({
      success: true,
      message: `Bulk import completed. Added: ${results.added.length}, Skipped: ${results.skipped.length}, Errors: ${results.errors.length}`,
      results
    });

  } catch (error) {
    console.error('Bulk import error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to import keywords'
    });
  }
});

// Export keywords for backup
router.get('/export', async (req, res) => {
  try {
    const keywords = await ProhibitedKeyword.find({})
      .sort({ category: 1, keyword: 1 })
      .select('keyword category severity description isActive createdAt');

    res.json({
      success: true,
      keywords,
      exportedAt: new Date(),
      totalCount: keywords.length
    });

  } catch (error) {
    console.error('Export keywords error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export keywords'
    });
  }
});

module.exports = router;
