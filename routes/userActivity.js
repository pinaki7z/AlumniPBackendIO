// routes/userActivity.js
const express = require("express");
const router = express.Router();
const Post = require("../models/post");
const Like = require("../models/postLikes");
const Comment = require("../models/postComment");
const Alumni = require("../models/Alumni");

// Get user's own activities (what they did)
router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 10 } = req.query;
    
    const activities = [];
    
    // Get user's recent posts
    const userPosts = await Post.find({ userId })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .select('_id description createdAt picturePath');
    
    userPosts.forEach(post => {
      activities.push({
        id: post._id,
        type: 'post',
        action: 'created a new post',
        content: post.description?.substring(0, 100) + (post.description?.length > 100 ? '...' : '') || 'Shared a post',
        postId: post._id,
        timestamp: post.createdAt,
        icon: 'post',
        hasImage: post.picturePath && post.picturePath.length > 0
      });
    });
    
    // Get user's recent likes
    const userLikes = await Like.find({ userId })
      .populate('postId', 'description userId')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit) * 2);
    
    userLikes.forEach(like => {
      if (like.postId) {
        activities.push({
          id: like._id,
          type: 'like',
          action: getReactionAction(like.likeType),
          content: like.postId.description?.substring(0, 100) + (like.postId.description?.length > 100 ? '...' : '') || 'a post',
          postId: like.postId._id,
          timestamp: like.createdAt,
          icon: getReactionIcon(like.likeType),
          isOwnPost: like.postId.userId.toString() === userId
        });
      }
    });
    
    // Get user's recent comments
    const userComments = await Comment.find({ userId })
      .populate('postId', 'description userId')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit) * 2);
    
    userComments.forEach(comment => {
      if (comment.postId) {
        activities.push({
          id: comment._id,
          type: 'comment',
          action: 'commented on',
          content: comment.postId.description?.substring(0, 80) + (comment.postId.description?.length > 80 ? '...' : '') || 'a post',
          comment: comment.content.substring(0, 100) + (comment.content.length > 100 ? '...' : ''),
          postId: comment.postId._id,
          timestamp: comment.createdAt,
          icon: 'comment',
          isOwnPost: comment.postId.userId.toString() === userId
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
    console.error("Error fetching user activities:", error);
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
