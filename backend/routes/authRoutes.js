// backend/routes/authRoutes.js
const router = require("express").Router();
const ctrl = require("../controllers/authController");

router.post("/send-otp", ctrl.sendOTP);       
router.post("/verify-otp", ctrl.verifyOTP);    // ADD THIS LINE
router.post("/signup", ctrl.signup);          
router.post("/login", ctrl.login);            
router.post("/forgot", ctrl.forgotPassword);  
router.post("/reset", ctrl.resetPassword);    

module.exports = router;