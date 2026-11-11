// backend/routes/adminRoutes.js
const router = require("express").Router();
const admin = require("../controllers/adminController");
const { verifyAdmin } = require("../middleware/authMiddleware");

router.post("/login", admin.adminLogin);
router.post("/add-professor", verifyAdmin, admin.addProfessor);
router.get("/professors", verifyAdmin, admin.listProfessors);
router.delete("/professors/:id", verifyAdmin, admin.removeProfessor);

module.exports = router;