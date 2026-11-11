const router = require("express").Router();
const ctrl = require("../controllers/forumController");
const { verifyToken } = require("../middleware/authMiddleware");

router.use(verifyToken);

router.get("/posts", ctrl.getAllPosts);
router.post("/posts", ctrl.createPost);
router.post("/posts/:postId/vote", ctrl.votePost);

router.get("/posts/:postId/comments", ctrl.getComments);
router.post("/posts/:postId/comments", ctrl.createComment);

module.exports = router;