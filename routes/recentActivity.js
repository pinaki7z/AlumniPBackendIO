// routes/recentActivity.js
const express = require("express");
const router = express.Router();
const Post = require("../models/post");
const Like = require("../models/postLikes");
const Comment = require("../models/postComment");
const Alumni = require("../models/Alumni");

// Get recent activities on user's own posts
router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 10 } = req.query;
    
    // Get all posts created by this user
    const userPosts = await Post.find({ userId }).select('_id description');
    const userPostIds = userPosts.map(post => post._id);
    
    if (userPostIds.length === 0) {
      return res.json({
        success: true,
        data: [],
        total: 0
      });
    }
    
    const activities = [];
    
    // Get recent likes on user's posts (exclude user's own likes)
    const recentLikes = await Like.find({
      postId: { $in: userPostIds },
      userId: { $ne: userId } // Exclude user's own likes
    })
    .populate('userId', 'firstName lastName profilePicture')
    .populate('postId', 'description')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit) * 3);
    
    recentLikes.forEach(like => {
      if (like.userId && like.postId) {
        activities.push({
          id: like._id,
          type: 'like',
          userId: like.userId._id,
          userName: `${like.userId.firstName} ${like.userId.lastName}`,
          profilePicture: like.userId.profilePicture,
          action: getReactionAction(like.likeType),
          postTitle: like.postId.description?.substring(0, 50) + (like.postId.description?.length > 50 ? '...' : '') || 'your post',
          postId: like.postId._id,
          timestamp: like.createdAt,
          icon: getReactionIcon(like.likeType)
        });
      }
    });
    
    // Get recent comments on user's posts (exclude user's own comments)
    const recentComments = await Comment.find({
      postId: { $in: userPostIds },
      userId: { $ne: userId } // Exclude user's own comments
    })
    .populate('userId', 'firstName lastName profilePicture')
    .populate('postId', 'description')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit) * 3);
    
    recentComments.forEach(comment => {
      if (comment.userId && comment.postId) {
        activities.push({
          id: comment._id,
          type: 'comment',
          userId: comment.userId._id,
          userName: `${comment.userId.firstName} ${comment.userId.lastName}`,
          profilePicture: comment.userId.profilePicture,
          action: 'commented on',
          postTitle: comment.postId.description?.substring(0, 50) + (comment.postId.description?.length > 50 ? '...' : '') || 'your post',
          comment: comment.content.substring(0, 80) + (comment.content.length > 80 ? '...' : ''),
          postId: comment.postId._id,
          timestamp: comment.createdAt,
          icon: 'comment'
        });
      }
    });
    
    // Sort all activities by timestamp and limit
    const sortedActivities = activities
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, parseInt(limit));
    
    res.json({
      success: true,
      data: sortedActivities,
      total: sortedActivities.length
    });
    
  } catch (error) {
    console.error("Error fetching recent activities:", error);
    res.status(500).json({ 
      success: false, 
      message: "Internal server error", 
      error: error.message 
    });
  }
});

// Helper function to get reaction action text
function getReactionAction(likeType) {
  const actions = {
    'like': 'liked',
    'thumbsUp': 'gave thumbs up to',
    'smile': 'smiled at',
    'clap': 'clapped for'
  };
  return actions[likeType] || 'reacted to';
}

// Helper function to get reaction icons
function getReactionIcon(likeType) {
  const icons = {
    'like': 'heart',
    'thumbsUp': 'thumbs-up',
    'smile': 'smile',
    'clap': 'clap'
  };
  return icons[likeType] || 'heart';
}

module.exports = router;
