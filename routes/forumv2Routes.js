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

// Get All Categories
router.get('/categories', async (req, res) => {
  try {
    const cats = await withUser(Forumv2Category.find()).lean();
    res.json(cats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Categories By User
router.get('/categories/user/:userId', async (req, res) => {
  try {
    const cats = await withUser(
      Forumv2Category.find({ userId: req.params.userId })
    ).lean();
    res.json(cats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Single Category
router.get('/categories/:id', async (req, res) => {
  try {
    const cat = await withUser(
      Forumv2Category.findById(req.params.id)
    ).lean();
    if (!cat) return res.status(404).json({ message: 'Category not found' });
    res.json(cat);
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

// Get All Topics
router.get('/topics', async (req, res) => {
  try {
    const topics = await withUser(Forumv2Topic.find()).lean();
    res.json(topics);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Topics By Category
router.get('/topics/category/:categoryId', async (req, res) => {
  try {
    const topics = await withUser(
      Forumv2Topic.find({ categoryId: req.params.categoryId })
    ).lean();
    res.json(topics);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Topics By User
router.get('/topics/user/:userId', async (req, res) => {
  try {
    const topics = await withUser(
      Forumv2Topic.find({ userId: req.params.userId })
    ).lean();
    res.json(topics);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Single Topic
router.get('/topics/:id', async (req, res) => {
  try {
    const topic = await withUser(
      Forumv2Topic.findById(req.params.id)
    ).lean();
    if (!topic) return res.status(404).json({ message: 'Topic not found' });
    res.json(topic);
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

// Get All Posts
router.get('/posts', async (req, res) => {
  try {
    const posts = await withUser(Forumv2Post.find()).lean();
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Posts By Topic
router.get('/posts/topic/:topicId', async (req, res) => {
  try {
    const posts = await withUser(
      Forumv2Post.find({ topicId: req.params.topicId })
    ).lean();
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Posts By User
router.get('/posts/user/:userId', async (req, res) => {
  try {
    const posts = await withUser(
      Forumv2Post.find({ userId: req.params.userId })
    ).lean();
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Single Post
router.get('/posts/:id', async (req, res) => {
  try {
    const post = await withUser(
      Forumv2Post.findById(req.params.id)
    ).lean();
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json(post);
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

// Get All Replies
router.get('/replies', async (req, res) => {
  try {
    const filter = {};
    if (req.query.postId)  filter.postId  = req.query.postId;
    if (req.query.replyId) filter.replyId = req.query.replyId;

    const replies = await withUser(Forumv2Reply.find(filter)).lean();
    res.json(replies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Single Reply
router.get('/replies/:id', async (req, res) => {
  try {
    const reply = await withUser(
      Forumv2Reply.findById(req.params.id)
    ).lean();
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
