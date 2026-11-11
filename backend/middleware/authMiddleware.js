// backend/middleware/authMiddleware.js
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;

// 1. Your existing Admin Middleware (DO NOT DELETE)
exports.verifyAdmin = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ msg: "No token provided" });

  const token = auth.split(" ")[1];
  if (!token) return res.status(401).json({ msg: "Invalid token" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded.isAdmin) return res.status(403).json({ msg: "Not admin" });
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ msg: "Invalid token" });
  }
};

// 2. NEW Middleware for Students & Professors (REQUIRED FOR COURSES)
exports.verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ msg: "No token provided, authorization denied" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // This attaches the user's { id, email, role } to the request
    next();
  } catch (err) {
    return res.status(401).json({ msg: "Token is invalid or expired" });
  }
};