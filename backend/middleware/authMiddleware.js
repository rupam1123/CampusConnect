const jwt = require('jsonwebtoken');
const User = require('../models/User');
const readToken = req => /^Bearer\s+(.+)$/i.exec(req.headers.authorization || '')?.[1];
exports.verifyAdmin = (req,res,next) => {
  try {
    const decoded=jwt.verify(readToken(req),process.env.JWT_SECRET);
    if (!decoded.isAdmin) return res.status(403).json({msg:'Administrator access required'});
    req.admin=decoded; next();
  } catch { return res.status(401).json({msg:'Invalid or expired admin session'}); }
};
exports.verifyToken = async (req,res,next) => {
  try {
    const decoded=jwt.verify(readToken(req),process.env.JWT_SECRET);
    const user=await User.findById(decoded.id);
    if (!user || user.email !== decoded.email || user.role !== decoded.role) return res.status(401).json({msg:'Invalid session. Please sign in again.'});
    req.user={id:String(user._id),email:user.email,role:user.role}; next();
  } catch { return res.status(401).json({msg:'Invalid or expired session'}); }
};
