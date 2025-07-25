// routes/newsRoutes.js
const express = require('express');
const News = require('../models/newsSchema');
const uploadv2 = require("../services/s3");
const router = express.Router();

// Upload featured image
router.post('/upload-featured-image', uploadv2.single('featuredImage'), (req, res) => {
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

// Upload additional images
router.post('/upload-additional-images', uploadv2.array('additionalImages', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No images uploaded.' 
      });
    }

    const imageUrls = req.files.map(file => file.location);
    res.json({ 
      success: true, 
      imageUrls: imageUrls 
    });
  } catch (error) {
    console.error('Images upload error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to upload images' 
    });
  }
});

// Create new news article
router.post('/create', async (req, res) => {
  try {
    const {
      title,
      subtitle,
      category,
      content,
      metaDescription,
      featuredImage,
      additionalImages,
      tags,
      priority,
      status,
      authorId,
      authorName,
      authorEmail,
      externalLinks,
      readTime,
      targetAudience,
      authorNote
    } = req.body;

    // Validate required fields
    if (!title || !category || !content || !metaDescription || !authorId || !authorName || !authorEmail) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Calculate read time if not provided
    const calculatedReadTime = readTime || calculateReadTime(content);

    // Create new news article
    const newNews = new News({
      title: title.trim(),
      subtitle: subtitle?.trim(),
      category,
      content,
      metaDescription: metaDescription.trim(),
      featuredImage,
      additionalImages: additionalImages || [],
      tags: tags || [],
      priority: priority || 'medium',
      status: status || 'draft',
      authorId,
      authorName: authorName.trim(),
      authorEmail: authorEmail.trim(),
      externalLinks: externalLinks || [],
      readTime: calculatedReadTime,
      targetAudience,
      authorNote,
      createdAt: new Date()
    });

    const savedNews = await newNews.save();

    res.status(201).json({
      success: true,
      message: `News article ${status === 'published' ? 'published' : 'saved as draft'} successfully!`,
      news: savedNews
    });

  } catch (error) {
    console.error('Create news error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create news article. Please try again.',
      error: error.message
    });
  }
});

// Get all news articles (for listing)
router.get('/all', async (req, res) => {
  try {
    const { 
      status, 
      category, 
      page = 1, 
      limit = 20, 
      search, 
      authorId,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    let query = {};
    
    // Filter by status
    if (status) {
      if (status.includes(',')) {
        query.status = { $in: status.split(',') };
      } else {
        query.status = status;
      }
    } else {
      // Default to published articles for public view
      query.status = 'published';
    }
    
    // Filter by category
    if (category && category !== 'all') {
      query.category = category;
    }
    
    // Filter by author
    if (authorId) {
      query.authorId = authorId;
    }
    
    // Search functionality
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { subtitle: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const skip = (page - 1) * limit;
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const news = await News.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(Number(limit))
      .select('-content') // Exclude full content for listing
      .lean();

    const total = await News.countDocuments(query);

    res.json({
      success: true,
      news,
      pagination: {
        current: Number(page),
        total: Math.ceil(total / limit),
        count: news.length,
        totalRecords: total
      }
    });

  } catch (error) {
    console.error('Get news error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch news articles'
    });
  }
});

// Get single news article by ID
router.get('/:id', async (req, res) => {
  try {
    const news = await News.findById(req.params.id);
    
    if (!news) {
      return res.status(404).json({
        success: false,
        message: 'News article not found'
      });
    }

    // Increment view count
    await News.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });
    news.views += 1;

    res.json({
      success: true,
      news
    });

  } catch (error) {
    console.error('Get news error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch news article'
    });
  }
});

// Update news article
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    
    // Remove fields that shouldn't be updated directly
    delete updateData._id;
    delete updateData.createdAt;
    delete updateData.views;
    delete updateData.likes;
    delete updateData.likedBy;
    delete updateData.comments;
    delete updateData.shares;
    
    // Calculate read time if content is updated
    if (updateData.content && !updateData.readTime) {
      updateData.readTime = calculateReadTime(updateData.content);
    }
    
    // Set publishedAt if status changes to published
    if (updateData.status === 'published') {
      const existingNews = await News.findById(id);
      if (existingNews && existingNews.status !== 'published') {
        updateData.publishedAt = new Date();
      }
    }

    const updatedNews = await News.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!updatedNews) {
      return res.status(404).json({
        success: false,
        message: 'News article not found'
      });
    }

    res.json({
      success: true,
      message: 'News article updated successfully!',
      news: updatedNews
    });

  } catch (error) {
    console.error('Update news error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update news article'
    });
  }
});

// Delete news article
router.delete('/:id', async (req, res) => {
  try {
    const news = await News.findByIdAndDelete(req.params.id);
    
    if (!news) {
      return res.status(404).json({
        success: false,
        message: 'News article not found'
      });
    }

    res.json({
      success: true,
      message: 'News article deleted successfully'
    });

  } catch (error) {
    console.error('Delete news error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete news article'
    });
  }
});

// Toggle like/unlike
router.patch('/:id/like', async (req, res) => {
  try {
    const { userId } = req.body;
    const news = await News.findById(req.params.id);
    
    if (!news) {
      return res.status(404).json({ 
        success: false, 
        message: 'News article not found' 
      });
    }

    const userIdStr = String(userId);
    const likedByStrings = news.likedBy.map(id => String(id));
    const idx = likedByStrings.indexOf(userIdStr);
    
    let isLiked;
    if (idx === -1) {
      // User hasn't liked, so add like
      news.likedBy.push(userId);
      news.likes = (news.likes || 0) + 1;
      isLiked = true;
    } else {
      // User has liked, so remove like
      news.likedBy.splice(idx, 1);
      news.likes = Math.max((news.likes || 0) - 1, 0);
      isLiked = false;
    }
    
    await news.save();
    
    res.json({ 
      success: true, 
      likes: news.likes, 
      isLiked: isLiked,
      message: isLiked ? 'News article liked' : 'News article unliked'
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
    const news = await News.findById(id);
    
    if (!news) {
      return res.status(404).json({
        success: false,
        message: 'News article not found'
      });
    }

    const isLiked = news.likedBy.includes(userId);
    
    res.json({
      success: true,
      isLiked: isLiked,
      likes: news.likes || 0
    });

  } catch (error) {
    console.error('Get like status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get like status'
    });
  }
});

// Update shares count
router.patch('/:id/share', async (req, res) => {
  try {
    const news = await News.findByIdAndUpdate(
      req.params.id,
      { $inc: { shares: 1 } },
      { new: true }
    );

    if (!news) {
      return res.status(404).json({
        success: false,
        message: 'News article not found'
      });
    }

    res.json({
      success: true,
      shares: news.shares,
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
    const news = await News.findById(req.params.id);
    
    if (!news) {
      return res.status(404).json({ 
        success: false, 
        message: 'News article not found' 
      });
    }

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Comment text is required'
      });
    }

    news.comments.push({ 
      authorId: userId, 
      authorName: userName, 
      authorEmail: userEmail, 
      text: text.trim() 
    });
    
    await news.save();
    
    res.status(201).json({ 
      success: true,
      message: 'Comment added successfully'
    });
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
    const news = await News.findById(req.params.id);
    
    if (!news) {
      return res.status(404).json({ 
        success: false, 
        message: 'News article not found' 
      });
    }

    const parent = news.comments.id(req.params.commentId);
    if (!parent) {
      return res.status(404).json({ 
        success: false, 
        message: 'Comment not found' 
      });
    }

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Reply text is required'
      });
    }

    news.comments.push({ 
      authorId: userId, 
      authorName: userName, 
      authorEmail: userEmail, 
      text: text.trim(), 
      parent: parent._id 
    });
    
    await news.save();
    
    res.status(201).json({ 
      success: true,
      message: 'Reply added successfully'
    });
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
    const news = await News.findById(req.params.id).lean();
    
    if (!news) {
      return res.status(404).json({ 
        success: false, 
        message: 'News article not found' 
      });
    }

    const nest = (list, parent = null) => {
      const safeList = list || [];
      return safeList
        .filter(c => String(c.parent) === String(parent))
        .map(c => ({ 
          ...c, 
          replies: nest(list, c._id) 
        }));
    };
    
    res.json({ 
      success: true, 
      comments: nest(news.comments) 
    });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get comments'
    });
  }
});

// Get analytics/stats
router.get('/stats/overview', async (req, res) => {
  try {
    const totalArticles = await News.countDocuments({ status: 'published' });
    const draftArticles = await News.countDocuments({ status: 'draft' });
    const archivedArticles = await News.countDocuments({ status: 'archived' });
    
    // Get total views, likes, comments, shares
    const stats = await News.aggregate([
      { $match: { status: 'published' } },
      {
        $group: {
          _id: null,
          totalViews: { $sum: '$views' },
          totalLikes: { $sum: '$likes' },
          totalShares: { $sum: '$shares' },
          totalComments: { $sum: { $size: '$comments' } }
        }
      }
    ]);
    
    // Get categories count
    const categories = await News.distinct('category', { status: 'published' });
    
    res.json({
      success: true,
      stats: {
        totalArticles,
        draftArticles,
        archivedArticles,
        totalViews: stats[0]?.totalViews || 0,
        totalLikes: stats[0]?.totalLikes || 0,
        totalComments: stats[0]?.totalComments || 0,
        totalShares: stats[0]?.totalShares || 0,
        categoriesCount: categories.length
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

// Get top performing articles
router.get('/stats/top-performing', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const topArticles = await News.find({ status: 'published' })
      .sort({ views: -1, likes: -1 })
      .limit(Number(limit))
      .select('title views likes comments shares category publishedAt readTime')
      .lean();

    res.json({
      success: true,
      articles: topArticles.map(article => ({
        ...article,
        commentsCount: article.comments?.length || 0
      }))
    });

  } catch (error) {
    console.error('Get top articles error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch top performing articles'
    });
  }
});

// Get category performance
router.get('/stats/category-performance', async (req, res) => {
  try {
    const categoryStats = await News.aggregate([
      { $match: { status: 'published' } },
      {
        $group: {
          _id: '$category',
          articles: { $sum: 1 },
          totalViews: { $sum: '$views' },
          totalLikes: { $sum: '$likes' },
          totalShares: { $sum: '$shares' },
          totalComments: { $sum: { $size: '$comments' } }
        }
      },
      {
        $project: {
          category: '$_id',
          articles: 1,
          views: '$totalViews',
          engagement: {
            $add: ['$totalLikes', '$totalShares', '$totalComments']
          }
        }
      },
      { $sort: { views: -1 } }
    ]);

    res.json({
      success: true,
      categoryPerformance: categoryStats
    });

  } catch (error) {
    console.error('Get category performance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category performance'
    });
  }
});

// Helper function to calculate read time
function calculateReadTime(content) {
  const wordsPerMinute = 200;
  const words = content.replace(/<[^>]*>/g, '').split(/\s+/).length;
  const minutes = Math.ceil(words / wordsPerMinute);
  return `${minutes} min read`;
}

module.exports = router;
