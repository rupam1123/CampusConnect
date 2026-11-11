const ForumPost = require("../models/ForumPost");
const ForumComment = require("../models/ForumComment");

exports.getAllPosts = async (req, res) => {
  try {
    const posts = await ForumPost.find()
      .populate("author", "role name username")
      .sort({ createdAt: -1 })
      .lean(); // Converts to plain JS objects for modification

    const userId = req.user.id;

    // Attach comment counts and user vote status to each post
    const populatedPosts = await Promise.all(posts.map(async (post) => {
      const commentsCount = await ForumComment.countDocuments({ post: post._id });
      
      let userVote = null;
      if (post.upvotes.map(id => id.toString()).includes(userId)) userVote = "up";
      if (post.downvotes.map(id => id.toString()).includes(userId)) userVote = "down";

      return {
        ...post,
        commentsCount,
        upvoteCount: post.upvotes.length,
        downvoteCount: post.downvotes.length,
        userVote
      };
    }));

    res.json(populatedPosts);
  } catch (err) {
    res.status(500).json({ msg: "Server error fetching forum posts" });
  }
};

exports.createPost = async (req, res) => {
  try {
    const { title, content, tag } = req.body;
    if (typeof title !== 'string' || !title.trim() || typeof content !== 'string' || !content.trim()) return res.status(400).json({ msg: 'Title and content are required' });
    if (!['General', 'Academics', 'Projects', 'Study Group', 'Career'].includes(tag)) return res.status(400).json({ msg: 'Select a valid category' });
    const newPost = await ForumPost.create({
      author: req.user.id, title, content, tag, upvotes: [req.user.id] // Auto-upvote own post
    });
    res.status(201).json(newPost);
  } catch (err) {
    res.status(500).json({ msg: "Server error creating post" });
  }
};

exports.votePost = async (req, res) => {
  try {
    const { voteType } = req.body; // 'up' or 'down'
    const post = await ForumPost.findById(req.params.postId);
    if (!post) return res.status(404).json({ msg: 'Post not found' });
    if (!['up', 'down', 'none'].includes(voteType)) return res.status(400).json({ msg: 'Invalid vote' });
    const userId = req.user.id;

    // Remove user from both arrays first to reset state
    post.upvotes = post.upvotes.filter(id => id.toString() !== userId);
    post.downvotes = post.downvotes.filter(id => id.toString() !== userId);

    // Apply new vote if they aren't just toggling it off
    if (voteType === "up") post.upvotes.push(userId);
    if (voteType === "down") post.downvotes.push(userId);

    await post.save();
    res.json({ msg: "Vote recorded" });
  } catch (err) {
    res.status(500).json({ msg: "Server error voting" });
  }
};

exports.getComments = async (req, res) => {
  try {
    const comments = await ForumComment.find({ post: req.params.postId })
      .populate("author", "role name username")
      .sort({ createdAt: 1 });
    res.json(comments);
  } catch (err) {
    res.status(500).json({ msg: "Server error fetching comments" });
  }
};

exports.createComment = async (req, res) => {
  try {
    if (typeof req.body.content !== 'string' || !req.body.content.trim()) return res.status(400).json({ msg: 'Comment text required' });
    if (!await ForumPost.exists({ _id: req.params.postId })) return res.status(404).json({ msg: 'Post not found' });
    const newComment = await ForumComment.create({
      post: req.params.postId,
      author: req.user.id,
      content: req.body.content
    });
    const populated = await newComment.populate("author", "role name username");
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ msg: "Server error posting comment" });
  }
};
