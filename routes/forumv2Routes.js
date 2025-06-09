const express = require('express');
const router = express.Router();
const Forumv2Category = require('../models/Forumv2Categories');
const Forumv2Topic    = require('../models/Forumv2Topic');
const Forumv2Post     = require('../models/Forumv2Post');
const Forumv2Reply    = require('../models/Forumv2Reply');

// Helper: populate user details
const withUser = (query) =>
  query.populate('userId', 'firstName lastName profilePicture');

// -------------------- Category Routes --------------------

// Create Category
router.post('/categories', async (req, res) => {
  try {
    const category = new Forumv2Category(req.body);
    await category.save();
    res.status(201).json(category);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get All Categories (enriched)
router.get('/categories', async (req, res) => {
  try {
    const cats = await withUser(Forumv2Category.find()).lean();
    const enriched = await Promise.all(cats.map(async cat => {
      const topics = await Forumv2Topic.find({ categoryId: cat._id })
        .sort({ createdAt: -1 })
        .select('_id title createdAt')
        .lean();
      const totalTopics = topics.length;
      const lastTopic = topics[0] || null;
      const topicIds = topics.map(t => t._id);
      const totalPosts = topicIds.length
        ? await Forumv2Post.countDocuments({ topicId: { $in: topicIds } })
        : 0;
      return {
        ...cat,
        totalTopics,
        totalPosts,
        lastTopic: lastTopic && {
          _id: lastTopic._id,
          title: lastTopic.title,
          createdAt: lastTopic.createdAt
        }
      };
    }));
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Categories By User (enriched)
router.get('/categories/user/:userId', async (req, res) => {
  try {
    const cats = await withUser(
      Forumv2Category.find({ userId: req.params.userId })
    ).lean();
    const enriched = await Promise.all(cats.map(async cat => {
      const topics = await Forumv2Topic.find({ categoryId: cat._id })
        .sort({ createdAt: -1 })
        .select('_id title createdAt')
        .lean();
      const totalTopics = topics.length;
      const lastTopic = topics[0] || null;
      const topicIds = topics.map(t => t._id);
      const totalPosts = topicIds.length
        ? await Forumv2Post.countDocuments({ topicId: { $in: topicIds } })
        : 0;
      return {
        ...cat,
        totalTopics,
        totalPosts,
        lastTopic: lastTopic && {
          _id: lastTopic._id,
          title: lastTopic.title,
          createdAt: lastTopic.createdAt
        }
      };
    }));
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Single Category (enriched)
router.get('/categories/:id', async (req, res) => {
  try {
    const cat = await withUser(
      Forumv2Category.findById(req.params.id)
    ).lean();
    if (!cat) return res.status(404).json({ message: 'Category not found' });
    const topics = await Forumv2Topic.find({ categoryId: cat._id })
      .sort({ createdAt: -1 })
      .select('_id title createdAt')
      .lean();
    const totalTopics = topics.length;
    const lastTopic = topics[0] || null;
    const topicIds = topics.map(t => t._id);
    const totalPosts = topicIds.length
      ? await Forumv2Post.countDocuments({ topicId: { $in: topicIds } })
      : 0;
    res.json({
      ...cat,
      totalTopics,
      totalPosts,
      lastTopic: lastTopic && {
        _id: lastTopic._id,
        title: lastTopic.title,
        createdAt: lastTopic.createdAt
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Category
router.put('/categories/:id', async (req, res) => {
  try {
    const updated = await Forumv2Category.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete Category
router.delete('/categories/:id', async (req, res) => {
  try {
    await Forumv2Category.findByIdAndDelete(req.params.id);
    res.json({ message: 'Category deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// -------------------- Topic Routes --------------------

// Create Topic
router.post('/topics', async (req, res) => {
  try {
    const topic = new Forumv2Topic(req.body);
    await topic.save();
    res.status(201).json(topic);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get All Topics (enriched)
router.get('/topics', async (req, res) => {
  try {
    const tops = await withUser(Forumv2Topic.find()).lean();
    const enriched = await Promise.all(tops.map(async topic => {
      const posts = await Forumv2Post.find({ topicId: topic._id })
        .sort({ createdAt: -1 })
        .select('_id title createdAt')
        .lean();
      const totalPosts = posts.length;
      const lastPost = posts[0] || null;
      const postIds = posts.map(p => p._id);
      const totalReplies = postIds.length
        ? await Forumv2Reply.countDocuments({ postId: { $in: postIds } })
        : 0;
      return {
        ...topic,
        totalPosts,
        totalReplies,
        lastPost: lastPost && {
          _id: lastPost._id,
          title: lastPost.title,
          createdAt: lastPost.createdAt
        }
      };
    }));
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Topics By Category (enriched)
router.get('/topics/category/:categoryId', async (req, res) => {
  try {
    const tops = await withUser(
      Forumv2Topic.find({ categoryId: req.params.categoryId })
    ).lean();
    const enriched = await Promise.all(tops.map(async topic => {
      const posts = await Forumv2Post.find({ topicId: topic._id })
        .sort({ createdAt: -1 })
        .select('_id title createdAt')
        .lean();
      const totalPosts = posts.length;
      const lastPost = posts[0] || null;
      const postIds = posts.map(p => p._id);
      const totalReplies = postIds.length
        ? await Forumv2Reply.countDocuments({ postId: { $in: postIds } })
        : 0;
      return {
        ...topic,
        totalPosts,
        totalReplies,
        lastPost: lastPost && {
          _id: lastPost._id,
          title: lastPost.title,
          createdAt: lastPost.createdAt
        }
      };
    }));
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Topics By User (enriched)
router.get('/topics/user/:userId', async (req, res) => {
  try {
    const tops = await withUser(
      Forumv2Topic.find({ userId: req.params.userId })
    ).lean();
    const enriched = await Promise.all(tops.map(async topic => {
      const posts = await Forumv2Post.find({ topicId: topic._id })
        .sort({ createdAt: -1 })
        .select('_id title createdAt')
        .lean();
      const totalPosts = posts.length;
      const lastPost = posts[0] || null;
      const postIds = posts.map(p => p._id);
      const totalReplies = postIds.length
        ? await Forumv2Reply.countDocuments({ postId: { $in: postIds } })
        : 0;
      return {
        ...topic,
        totalPosts,
        totalReplies,
        lastPost: lastPost && {
          _id: lastPost._id,
          title: lastPost.title,
          createdAt: lastPost.createdAt
        }
      };
    }));
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Single Topic (enriched)
router.get('/topics/:id', async (req, res) => {
  try {
    const topic = await withUser(
      Forumv2Topic.findById(req.params.id)
    ).lean();
    if (!topic) return res.status(404).json({ message: 'Topic not found' });
    const posts = await Forumv2Post.find({ topicId: topic._id })
      .sort({ createdAt: -1 })
      .select('_id title createdAt')
      .lean();
    const totalPosts = posts.length;
    const lastPost = posts[0] || null;
    const postIds = posts.map(p => p._id);
    const totalReplies = postIds.length
      ? await Forumv2Reply.countDocuments({ postId: { $in: postIds } })
      : 0;
    res.json({
      ...topic,
      totalPosts,
      totalReplies,
      lastPost: lastPost && {
        _id: lastPost._id,
        title: lastPost.title,
        createdAt: lastPost.createdAt
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Topic
router.put('/topics/:id', async (req, res) => {
  try {
    const updated = await Forumv2Topic.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete Topic
router.delete('/topics/:id', async (req, res) => {
  try {
    await Forumv2Topic.findByIdAndDelete(req.params.id);
    res.json({ message: 'Topic deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// -------------------- Post Routes --------------------

// Create Post
router.post('/posts', async (req, res) => {
  try {
    const post = new Forumv2Post(req.body);
    await post.save();
    res.status(201).json(post);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get All Posts (enriched)
router.get('/posts', async (req, res) => {
  try {
    const posts = await withUser(Forumv2Post.find()).lean();
    const enriched = await Promise.all(posts.map(async post => {
      const totalReplies = await Forumv2Reply.countDocuments({ postId: post._id });
      const last = await Forumv2Reply.find({ postId: post._id })
        .sort({ createdAt: -1 })
        .limit(1)
        .select('_id createdAt content.html')
        .lean();
      const lastReply = last[0] || null;
      return {
        ...post,
        totalReplies,
        upvotes:   post.upvotes   || 0,
        downvotes: post.downvotes || 0,
        lastReply: lastReply && {
          _id: lastReply._id,
          content: lastReply['content.html'] || lastReply.content.html,
          createdAt: lastReply.createdAt
        }
      };
    }));
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Posts By Topic (enriched)
router.get('/posts/topic/:topicId', async (req, res) => {
  try {
    const posts = await withUser(
      Forumv2Post.find({ topicId: req.params.topicId })
    ).lean();
    const enriched = await Promise.all(posts.map(async post => {
      const totalReplies = await Forumv2Reply.countDocuments({ postId: post._id });
      const last = await Forumv2Reply.find({ postId: post._id })
        .sort({ createdAt: -1 })
        .limit(1)
        .select('_id createdAt content.html')
        .lean();
      const lastReply = last[0] || null;
      return {
        ...post,
        totalReplies,
        upvotes:   post.upvotes   || 0,
        downvotes: post.downvotes || 0,
        lastReply: lastReply && {
          _id: lastReply._id,
          content: lastReply['content.html'] || lastReply.content.html,
          createdAt: lastReply.createdAt
        }
      };
    }));
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Posts By User (enriched)
router.get('/posts/user/:userId', async (req, res) => {
  try {
    const posts = await withUser(
      Forumv2Post.find({ userId: req.params.userId })
    ).lean();
    const enriched = await Promise.all(posts.map(async post => {
      const totalReplies = await Forumv2Reply.countDocuments({ postId: post._id });
      const last = await Forumv2Reply.find({ postId: post._id })
        .sort({ createdAt: -1 })
        .limit(1)
        .select('_id createdAt content.html')
        .lean();
      const lastReply = last[0] || null;
      return {
        ...post,
        totalReplies,
        upvotes:   post.upvotes   || 0,
        downvotes: post.downvotes || 0,
        lastReply: lastReply && {
          _id: lastReply._id,
          content: lastReply['content.html'] || lastReply.content.html,
          createdAt: lastReply.createdAt
        }
      };
    }));
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Single Post (enriched)
router.get('/posts/:id', async (req, res) => {
  try {
    const post = await withUser(
      Forumv2Post.findById(req.params.id)
    ).lean();
    if (!post) return res.status(404).json({ message: 'Post not found' });
    const totalReplies = await Forumv2Reply.countDocuments({ postId: post._id });
    const last = await Forumv2Reply.find({ postId: post._id })
      .sort({ createdAt: -1 })
      .limit(1)
      .select('_id createdAt content.html')
      .lean();
    const lastReply = last[0] || null;
    res.json({
      ...post,
      totalReplies,
      upvotes:   post.upvotes   || 0,
      downvotes: post.downvotes || 0,
      lastReply: lastReply && {
        _id: lastReply._id,
        content: lastReply['content.html'] || lastReply.content.html,
        createdAt: lastReply.createdAt
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}); 

// Update Post
router.put('/posts/:id', async (req, res) => {
  try {
    const updated = await Forumv2Post.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete Post
router.delete('/posts/:id', async (req, res) => {
  try {
    await Forumv2Post.findByIdAndDelete(req.params.id);
    res.json({ message: 'Post deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// -------------------- Reply Routes --------------------

// Create Reply
router.post('/replies', async (req, res) => {
  try {
    const reply = new Forumv2Reply(req.body);
    await reply.save();
    res.status(201).json(reply);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get All Replies (with user + optional filter)
router.get('/replies', async (req, res) => {
  try {
    const filter = {};
    if (req.query.postId)  filter.postId  = req.query.postId;
    if (req.query.replyId) filter.replyId = req.query.replyId;

    const replies = await withUser(Forumv2Reply.find(filter));
    res.json(replies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Single Reply (with user)
router.get('/replies/:id', async (req, res) => {
  try {
    const reply = await withUser(Forumv2Reply.findById(req.params.id));
    if (!reply) return res.status(404).json({ message: 'Reply not found' });
    res.json(reply);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Reply
router.put('/replies/:id', async (req, res) => {
  try {
    const updated = await Forumv2Reply.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete Reply
router.delete('/replies/:id', async (req, res) => {
  try {
    await Forumv2Reply.findByIdAndDelete(req.params.id);
    res.json({ message: 'Reply deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
