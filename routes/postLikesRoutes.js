const express = require('express');
const router = express.Router();
const Like = require('../models/postLikes');
const Post = require('../models/post');

// Helper function to map likeType to Post counter field
const getCounterField = (likeType) => {
  const fieldMap = {
    'smile': 'smileCount',
    'clap': 'clapCount',
    'thumbsUp': 'thumbsUpCount',
    'like': 'likeCount'
  };
  return fieldMap[likeType] || 'likeCount';
};

// CREATE - Add a like
router.post('/', async (req, res) => {
  try {
    const { postId, userId, userName, likeType = 'like' } = req.body;
    
    // Validation
    if (!postId || !userId || !userName) {
      return res.status(400).json({ 
        success: false, 
        message: 'postId, userId, and userName are required' 
      });
    }

    // Check if post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ 
        success: false, 
        message: 'Post not found' 
      });
    }

    // Check if user already liked the post
    const existingLike = await Like.findOne({ postId, userId });
    if (existingLike) {
      // Remove the like
      await Like.findByIdAndDelete(existingLike._id);

      // Update post counter
      const counterField = getCounterField(existingLike.likeType);
      await Post.findByIdAndUpdate(postId, {
        $inc: { [counterField]: -1 }
      });

      res.status(200).json({
        success: true,
        message: 'Like removed successfully',
        data: existingLike
      });
    } else {
      // Create like
      const like = new Like({
        postId,
        userId,
        userName,
        likeType
      });

      await like.save();

      // Update post counter
      const counterField = getCounterField(likeType);
      await Post.findByIdAndUpdate(postId, {
        $inc: { [counterField]: 1 }
      });

      // Populate user info
      await like.populate('userId', 'firstName lastName userName profilePicture');

      res.status(201).json({
        success: true,
        message: 'Like added successfully',
        data: like
      });
    }

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// READ - Get all likes for a specific post
router.get('/post/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const { page = 1, limit = 20, likeType } = req.query;

    // Build filter
    const filter = { postId };
    if (likeType && ['like', 'smile', 'clap', 'thumbsUp'].includes(likeType)) {
      filter.likeType = likeType;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    const likes = await Like
      .find(filter)
      .populate('userId', 'firstName lastName userName profilePicture')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Like.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: likes,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalLikes: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// READ - Get all likes by a specific user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20, likeType } = req.query;

    // Build filter
    const filter = { userId };
    if (likeType && ['like', 'smile', 'clap', 'thumbsUp'].includes(likeType)) {
      filter.likeType = likeType;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    const likes = await Like
      .find(filter)
      .populate('postId', 'description picturePath userId createdAt')
      .populate('userId', 'firstName lastName userName profilePicture')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Like.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: likes,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalLikes: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// READ - Get a specific like by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const like = await Like
      .findById(id)
      .populate('userId', 'firstName lastName userName profilePicture')
      .populate('postId', 'description userId');

    if (!like) {
      return res.status(404).json({ 
        success: false, 
        message: 'Like not found' 
      });
    }

    res.status(200).json({
      success: true,
      data: like
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// READ - Check if user liked a specific post
router.get('/check/:postId/:userId', async (req, res) => {
  try {
    const { postId, userId } = req.params;

    const like = await Like.findOne({ postId, userId });

    res.status(200).json({
      success: true,
      data: {
        isLiked: !!like,
        likeType: like ? like.likeType : null,
        likeId: like ? like._id : null
      }
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// UPDATE - Change like type
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { likeType } = req.body;

    // Validation
    if (!likeType || !['like', 'smile', 'clap', 'thumbsUp'].includes(likeType)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Valid likeType is required (like, smile, clap, thumbsUp)' 
      });
    }

    const like = await Like.findById(id);
    if (!like) {
      return res.status(404).json({ 
        success: false, 
        message: 'Like not found' 
      });
    }

    const oldLikeType = like.likeType;

    // If same like type, no need to update
    if (oldLikeType === likeType) {
      return res.status(200).json({
        success: true,
        message: 'Like type unchanged',
        data: like
      });
    }

    // Update like type
    like.likeType = likeType;
    await like.save();

    // Update post counters
    const oldCounterField = getCounterField(oldLikeType);
    const newCounterField = getCounterField(likeType);

    await Post.findByIdAndUpdate(like.postId, {
      $inc: {
        [oldCounterField]: -1,
        [newCounterField]: 1
      }
    });

    await like.populate('userId', 'firstName lastName userName profilePicture');

    res.status(200).json({
      success: true,
      message: 'Like type updated successfully',
      data: like
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// DELETE - Remove a like by ID
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const like = await Like.findById(id);
    if (!like) {
      return res.status(404).json({ 
        success: false, 
        message: 'Like not found' 
      });
    }

    // Delete the like
    await Like.findByIdAndDelete(id);

    // Update post counter
    const counterField = getCounterField(like.likeType);
    await Post.findByIdAndUpdate(like.postId, {
      $inc: { [counterField]: -1 }
    });

    res.status(200).json({
      success: true,
      message: 'Like removed successfully',
      data: like
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// DELETE - Remove like by postId and userId (toggle functionality)
router.delete('/toggle/:postId/:userId', async (req, res) => {
  try {
    const { postId, userId } = req.params;

    const like = await Like.findOne({ postId, userId });
    if (!like) {
      return res.status(404).json({ 
        success: false, 
        message: 'Like not found' 
      });
    }

    // Delete the like
    await Like.findOneAndDelete({ postId, userId });

    // Update post counter
    const counterField = getCounterField(like.likeType);
    await Post.findByIdAndUpdate(postId, {
      $inc: { [counterField]: -1 }
    });

    res.status(200).json({
      success: true,
      message: 'Like removed successfully',
      data: like
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// GET - Get like counts for a post
router.get('/counts/:postId', async (req, res) => {
  try {
    const { postId } = req.params;

    // Aggregate likes by type
    const likeCounts = await Like.aggregate([
      { $match: { postId: new require('mongoose').Types.ObjectId(postId) } },
      { 
        $group: {
          _id: '$likeType',
          count: { $sum: 1 }
        }
      }
    ]);

    // Format response
    const counts = {
      like: 0,
      smile: 0,
      clap: 0,
      thumbsUp: 0,
      total: 0
    };

    likeCounts.forEach(item => {
      counts[item._id] = item.count;
      counts.total += item.count;
    });

    res.status(200).json({
      success: true,
      data: counts
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
});

module.exports = router;
