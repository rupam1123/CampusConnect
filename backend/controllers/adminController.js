// backend/controllers/adminController.js
const Professor = require("../models/Professor");
const User = require("../models/User");
const jwt = require("jsonwebtoken");

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const JWT_SECRET = process.env.JWT_SECRET;
const { normalizeEmail, isAllowedEmail } = require('../utils/validation');

exports.adminLogin = async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ msg: "Password required" });
  if (password !== ADMIN_PASSWORD) return res.status(401).json({ msg: "Invalid admin password" });
  const token = jwt.sign({ isAdmin: true }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ msg: "Admin login success", token });
};

exports.addProfessor = async (req, res) => {
  try {
    const { email, name } = req.body;
    if (!isAllowedEmail(email)) return res.status(400).json({ msg: 'Use a Gmail address or existing IITK address' });

    const existing = await Professor.findOne({ email: normalizeEmail(email) });
    if (existing) return res.status(400).json({ msg: "Professor already exists" });

    const student = await User.findOne({ email: normalizeEmail(email), role: 'Student' });
    if (student) return res.status(409).json({ msg: 'This email already belongs to a student account' });
    await Professor.create({ email: normalizeEmail(email), name: name || "" });
    res.json({ msg: "Professor added" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

exports.listProfessors = async (req, res) => {
  try {
    const profs = await Professor.find().sort({ email: 1 });
    // For each, check if an account exists
    const result = await Promise.all(profs.map(async (p) => {
      const userExists = await User.exists({ email: p.email, role: "Professor" });
      return { _id: p._id, email: p.email, name: p.name, hasAccount: !!userExists };
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
};

exports.removeProfessor = async (req, res) => {
  try {
    const prof = await Professor.findById(req.params.id);
    if (!prof) return res.status(404).json({ msg: "Professor not found in whitelist" });

    // Check if an account already exists with this email
    const userAccount = await User.findOne({ email: prof.email, role: "Professor" });
    if (userAccount) {
      return res.status(409).json({
        msg: `An account already exists for ${prof.email}. Please ask the professor to delete their account first before removing them from the whitelist.`,
        hasAccount: true,
      });
    }

    await Professor.findByIdAndDelete(req.params.id);
    res.json({ msg: `${prof.email} removed from whitelist.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};
