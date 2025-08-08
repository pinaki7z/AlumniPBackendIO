const express = require('express');
const router = express.Router();
const Comment = require('../models/postComment');
const Post = require('../models/post');
const mongoose = require('mongoose');

// Helper function to validate ObjectId
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

// CREATE - Add a comment
router.post('/', async (req, res) => {
  try {
    const { postId, userId, userName, content, parentCommentId = null } = req.body;
    
    // Validation
    if (!postId || !userId || !userName || !content) {
      return res.status(400).json({ 
        success: false, 
        message: 'postId, userId, userName, and content are required' 
      });
    }

    if (!isValidObjectId(postId) || !isValidObjectId(userId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid postId or userId' 
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

    // If it's a reply, check if parent comment exists
    if (parentCommentId) {
      if (!isValidObjectId(parentCommentId)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid parentCommentId' 
        });
      }

      const parentComment = await Comment.findById(parentCommentId);
      if (!parentComment) {
        return res.status(404).json({ 
          success: false, 
          message: 'Parent comment not found' 
        });
      }
    }

    // Create comment
    const comment = new Comment({
      postId,
      userId,
      userName,
      content,
      parentCommentId
    });

    await comment.save();

    // Update post comment count
    await Post.findByIdAndUpdate(postId, {
      $inc: { commentCount: 1 }
    });

    // Update parent comment reply count if it's a reply
    if (parentCommentId) {
      await Comment.findByIdAndUpdate(parentCommentId, {
        $inc: { replyCount: 1 }
      });
    }

    // Populate user info
    await comment.populate('userId', 'firstName lastName userName profilePicture');

    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      data: comment
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// READ - Get all comments for a specific post
router.get('/post/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    if (!isValidObjectId(postId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid postId' 
      });
    }

    // Calculate pagination
    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    // Get top-level comments only (no replies)
    const comments = await Comment
      .find({ postId, parentCommentId: null })
      .populate('userId', 'firstName lastName userName profilePicture')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Comment.countDocuments({ postId, parentCommentId: null });

    res.status(200).json({
      success: true,
      data: comments,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalComments: total,
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

// READ - Get replies for a specific comment
router.get('/replies/:commentId', async (req, res) => {
  try {
    const { commentId } = req.params;
    const { page = 1, limit = 5 } = req.query;

    if (!isValidObjectId(commentId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid commentId' 
      });
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    const replies = await Comment
      .find({ parentCommentId: commentId })
      .populate('userId', 'firstName lastName userName profilePicture')
      .sort({ createdAt: 1 }) // Oldest first for replies
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Comment.countDocuments({ parentCommentId: commentId });

    res.status(200).json({
      success: true,
      data: replies,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalReplies: total,
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

// READ - Get all comments by a specific user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!isValidObjectId(userId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid userId' 
      });
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    const comments = await Comment
      .find({ userId })
      .populate('postId', 'description userId createdAt')
      .populate('userId', 'firstName lastName userName profilePicture')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Comment.countDocuments({ userId });

    res.status(200).json({
      success: true,
      data: comments,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalComments: total,
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

// READ - Get a specific comment by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid comment ID' 
      });
    }

    const comment = await Comment
      .findById(id)
      .populate('userId', 'firstName lastName userName profilePicture')
      .populate('postId', 'description userId');

    if (!comment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Comment not found' 
      });
    }

    res.status(200).json({
      success: true,
      data: comment
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// UPDATE - Edit a comment
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { content, reported } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid comment ID' 
      });
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Content is required' 
      });
    }

    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Comment not found' 
      });
    }

    // Update fields
    comment.content = content.trim();
    if (reported !== undefined) {
      comment.reported = reported;
    }

    await comment.save();
    await comment.populate('userId', 'firstName lastName userName profilePicture');

    res.status(200).json({
      success: true,
      message: 'Comment updated successfully',
      data: comment
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// UPDATE - Report/Unreport a comment
router.patch('/:id/report', async (req, res) => {
  try {
    const { id } = req.params;
    const { reported = true } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid comment ID' 
      });
    }

    const comment = await Comment.findByIdAndUpdate(
      id,
      { reported },
      { new: true }
    ).populate('userId', 'firstName lastName userName profilePicture');

    if (!comment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Comment not found' 
      });
    }

    res.status(200).json({
      success: true,
      message: `Comment ${reported ? 'reported' : 'unreported'} successfully`,
      data: comment
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// DELETE - Remove a comment
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid comment ID' 
      });
    }

    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Comment not found' 
      });
    }

    // Check if it has replies
    const replyCount = await Comment.countDocuments({ parentCommentId: id });
    if (replyCount > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete comment with existing replies. Delete replies first.' 
      });
    }

    // Delete the comment
    await Comment.findByIdAndDelete(id);

    // Update post comment count
    await Post.findByIdAndUpdate(comment.postId, {
      $inc: { commentCount: -1 }
    });

    // Update parent comment reply count if it was a reply
    if (comment.parentCommentId) {
      await Comment.findByIdAndUpdate(comment.parentCommentId, {
        $inc: { replyCount: -1 }
      });
    }

    res.status(200).json({
      success: true,
      message: 'Comment deleted successfully',
      data: comment
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// DELETE - Remove all comments for a post (admin function)
router.delete('/post/:postId/all', async (req, res) => {
  try {
    const { postId } = req.params;

    if (!isValidObjectId(postId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid postId' 
      });
    }

    const deletedComments = await Comment.deleteMany({ postId });

    // Reset post comment count
    await Post.findByIdAndUpdate(postId, {
      commentCount: 0
    });

    res.status(200).json({
      success: true,
      message: 'All comments deleted successfully',
      deletedCount: deletedComments.deletedCount
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// GET - Get comment statistics for a post
router.get('/stats/:postId', async (req, res) => {
  try {
    const { postId } = req.params;

    if (!isValidObjectId(postId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid postId' 
      });
    }

    const stats = await Comment.aggregate([
      { $match: { postId: new mongoose.Types.ObjectId(postId) } },
      {
        $group: {
          _id: null,
          totalComments: { $sum: 1 },
          totalReplies: {
            $sum: {
              $cond: [{ $ne: ['$parentCommentId', null] }, 1, 0]
            }
          },
          totalTopLevel: {
            $sum: {
              $cond: [{ $eq: ['$parentCommentId', null] }, 1, 0]
            }
          },
          reportedComments: {
            $sum: {
              $cond: ['$reported', 1, 0]
            }
          }
        }
      }
    ]);

    const result = stats[0] || {
      totalComments: 0,
      totalReplies: 0,
      totalTopLevel: 0,
      reportedComments: 0
    };

    res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
});


// Add like/unlike comment functionality
router.post('/:commentId/like', async (req, res) => {
  try {
    const { commentId } = req.params;
    const { userId, reaction = 'like' } = req.body;

    if (!isValidObjectId(commentId) || !isValidObjectId(userId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid commentId or userId' 
      });
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Comment not found' 
      });
    }

    // Check if user already liked
    const existingLikeIndex = comment.likes.findIndex(
      like => like.userId.toString() === userId
    );

    if (existingLikeIndex > -1) {
      // Remove like
      comment.likes.splice(existingLikeIndex, 1);
      comment.likeCount = Math.max(0, comment.likeCount - 1);
    } else {
      // Add like
      comment.likes.push({ userId, reaction });
      comment.likeCount += 1;
    }

    await comment.save();

    res.status(200).json({
      success: true,
      message: existingLikeIndex > -1 ? 'Like removed' : 'Like added',
      data: {
        isLiked: existingLikeIndex === -1,
        likeCount: comment.likeCount
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

// Get comment like status
router.get('/:commentId/like/:userId', async (req, res) => {
  try {
    const { commentId, userId } = req.params;

    if (!isValidObjectId(commentId) || !isValidObjectId(userId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid commentId or userId' 
      });
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Comment not found' 
      });
    }

    const isLiked = comment.likes.some(like => like.userId.toString() === userId);
    const userReaction = comment.likes.find(like => like.userId.toString() === userId)?.reaction;

    res.status(200).json({
      success: true,
      data: {
        isLiked,
        reaction: userReaction,
        likeCount: comment.likeCount
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


router.get('/count/:postId', async (req, res) => {
  try {
    const { postId } = req.params;

    if (!isValidObjectId(postId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid postId' 
      });
    }

    // Count only main comments (where parentCommentId is null)
    const count = await Comment.countDocuments({ 
      postId, 
      parentCommentId: null 
    });

    res.status(200).json({
      success: true,
      data: { count },
      message: 'Main comment count retrieved successfully'
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
