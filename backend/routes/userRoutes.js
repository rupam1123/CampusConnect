const router = require("express").Router();
const ctrl = require("../controllers/userController");
const { verifyToken } = require("../middleware/authMiddleware");

router.use(verifyToken);

router.put("/identity", ctrl.updateIdentity);
router.put("/password", ctrl.updatePassword);
router.post("/delete", ctrl.deleteAccount); // Using POST to safely send password body

module.exports = router;