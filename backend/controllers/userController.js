const User = require("../models/User");
const Course = require("../models/Course");
const Application = require("../models/Application");
const ForumPost = require("../models/ForumPost");
const ForumComment = require("../models/ForumComment");
const Feedback = require("../models/Feedback");
const bcrypt = require("bcrypt");
const { validPassword } = require('../utils/validation');

// 1. Update Identity (Username for Students, Name for Professors)
exports.updateIdentity = async (req, res) => {
  try {
    const { newIdentity } = req.body;
    if (typeof newIdentity !== 'string' || !newIdentity.trim() || newIdentity.length > 100) {
      return res.status(400).json({ msg: "Field cannot be empty." });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: 'Account not found' });

    if (user.role === "Student") {
      // Must be unique
      const existingUser = await User.findOne({ username: newIdentity.trim() });
      if (existingUser && existingUser._id.toString() !== user._id.toString()) {
        return res.status(400).json({ msg: "Username already taken. Please choose another." });
      }
      user.username = newIdentity.trim();
    } else {
      // Professor name update
      user.name = newIdentity.trim();
    }

    await user.save();
    
    // Return sanitized user object to update frontend localStorage
    const updatedUser = { id: user._id, _id: user._id, email: user.email, role: user.role, name: user.name, username: user.username };
    res.json({ msg: "Profile updated successfully", user: updatedUser });
  } catch (err) {
    res.status(500).json({ msg: "Server error updating profile." });
  }
};

// 2. Update Password
exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (typeof currentPassword !== 'string' || !validPassword(newPassword)) return res.status(400).json({ msg: 'Enter the current password and a new password of at least 8 characters' });

    const user = await User.findById(req.user.id);
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: "Incorrect current password." });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ msg: "Password updated successfully." });
  } catch (err) {
    res.status(500).json({ msg: "Server error updating password." });
  }
};

// 3. Delete Account & All Associated Data
// 3. Delete Account (The Ghost Protocol / Anonymization)
exports.deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;
    const user = await User.findById(req.user.id);

    // Verify password before destructive action
    const isMatch = req.platformIdentity ? password === 'DELETE' : typeof password === 'string' && await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: "Incorrect password. Deletion denied." });
    }

    // Step 1: Delete temporary/active data
    if (user.role === "Student") {
      await Application.deleteMany({ student: user._id });
      await Feedback.deleteMany({ student: user._id });
      // Remove them from active course rosters
      await Course.updateMany(
        { students: user._id }, 
        { $pull: { students: user._id } }
      );
    } else if (user.role === "Professor") {
      if (await Course.exists({ professor: user._id })) return res.status(409).json({ msg: 'Delete or transfer your courses before deleting your account' });
      if (await require('../models/Project').exists({ professor: user._id })) return res.status(409).json({ msg: 'Delete your projects before deleting your account' });
      await Course.updateMany({ coInstructors: user._id }, { $pull: { coInstructors: user._id } });
    }

    // Step 2: Anonymize the User
    // We use their already-anonymous username to guarantee uniqueness for the DB
    // and keep their ghost identity continuous on old forum posts.
    
    // Free up their original email, using the username to keep this unique too
    user.email = `deleted_${user._id}@system.local`;
    if (req.platformIdentity) delete user.identityId;
    
    // Lock them out with a completely random, unknowable hash
    user.password = await bcrypt.hash(Math.random().toString(), 10); 
    user.name = "[Deleted User]";
    
    // Simply prepend 'deleted_' to their existing anonymous handle
    user.username = `deleted_${user._id}`;
    
    // Save the ghosted user back to the database
    await user.save();

    res.json({ msg: `Account securely anonymized. Public posts remain as ${user.username}.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error during account deletion." });
  }
};
