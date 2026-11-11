const User = require('../models/User');
const OTP = require('../models/OTP');
const Professor = require('../models/Professor');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { randomInt } = require('node:crypto');
const sendEmail = require('../utils/sendEmail');
const { normalizeEmail, isAllowedEmail, validPassword } = require('../utils/validation');
const validRole = role => ['Student', 'Professor'].includes(role);
const liveOTP = (email, otp, purpose) => OTP.findOne({ email, otp: String(otp), purpose, expiresAt: { $gt: new Date() } });
async function issueOTP(email, purpose) {
  const otp = randomInt(100000, 1000000).toString();
  await OTP.deleteMany({ email, purpose });
  const record = await OTP.create({ email, otp, purpose, expiresAt: new Date(Date.now() + 300000) });
  try { await sendEmail(email, 'CampusConnect - Your verification code', `Your ${purpose === 'reset' ? 'password reset' : 'signup'} code is ${otp}. It expires in 5 minutes.`); }
  catch (error) { await OTP.deleteOne({ _id: record._id }); throw error; }
}
async function checkRole(email, role) {
  const faculty = await Professor.findOne({ email });
  if (role === 'Professor' && !faculty) return 'Email is not authorized for a professor account';
  if (role === 'Student' && faculty) return 'This email is reserved for a professor account';
  return null;
}
exports.sendOTP = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email); const { role } = req.body;
    if (!isAllowedEmail(email)) return res.status(400).json({ msg: 'Use a Gmail address or existing IITK address' });
    if (!validRole(role)) return res.status(400).json({ msg: 'Select a valid role' });
    if (await User.exists({ email })) return res.status(409).json({ msg: 'Email already registered. Please log in.' });
    const error = await checkRole(email, role); if (error) return res.status(403).json({ msg: error });
    await issueOTP(email, 'signup'); return res.json({ msg: 'OTP sent' });
  } catch (error) { console.error('OTP delivery failed:', error.message); return res.status(503).json({ msg: 'Verification email could not be sent. Please try again later.' }); }
};
exports.verifyOTP = async (req, res) => {
  const email = normalizeEmail(req.body.email);
  if (!await liveOTP(email, req.body.otp, 'signup')) return res.status(400).json({ msg: 'Invalid or expired OTP' });
  return res.json({ msg: 'OTP verified successfully' });
};
exports.signup = async (req, res) => {
  try {
    const { name, username, password, otp, role } = req.body; const email = normalizeEmail(req.body.email);
    if (!isAllowedEmail(email) || !validRole(role) || !validPassword(password)) return res.status(400).json({ msg: 'Provide a valid email, role and password of at least 8 characters' });
    if (role === 'Student' && (typeof username !== 'string' || !username.trim())) return res.status(400).json({ msg: 'Username required' });
    if (role === 'Professor' && (typeof name !== 'string' || !name.trim())) return res.status(400).json({ msg: 'Full name required' });
    if (!await liveOTP(email, otp, 'signup')) return res.status(400).json({ msg: 'Invalid or expired OTP' });
    const error = await checkRole(email, role); if (error) return res.status(403).json({ msg: error });
    if (await User.exists({ email })) return res.status(409).json({ msg: 'Email already registered' });
    const user = await User.create({ email, role, password: await bcrypt.hash(password, 10), isVerified: true, ...(role === 'Professor' ? { name: name.trim() } : { username: username.trim() }) });
    await OTP.deleteMany({ email, purpose: 'signup' });
    return res.status(201).json({ msg: 'Signup successful', user: { id: user._id, email: user.email, role: user.role } });
  } catch (error) { return res.status(error.code === 11000 ? 409 : 500).json({ msg: error.code === 11000 ? 'Email or username already registered' : 'Signup failed' }); }
};
exports.login = async (req, res) => {
  const email = normalizeEmail(req.body.email); const { password, role } = req.body;
  if (!email || typeof password !== 'string' || !validRole(role)) return res.status(400).json({ msg: 'Email, password and role required' });
  const user = await User.findOne({ email });
  if (!user || !await bcrypt.compare(password, user.password)) return res.status(401).json({ msg: 'Invalid credentials' });
  if (user.role !== role) return res.status(403).json({ msg: `Select the ${user.role} role for this account` });
  const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
  return res.json({ msg: 'Login success', token, user: { id: user._id, email: user.email, role: user.role, name: user.name, username: user.username } });
};
exports.forgotPassword = async (req, res) => {
  const email = normalizeEmail(req.body.email);
  if (!isAllowedEmail(email)) return res.status(400).json({ msg: 'Enter your Gmail or existing IITK email' });
  if (await User.exists({ email })) { try { await issueOTP(email, 'reset'); } catch { return res.status(503).json({ msg: 'Password reset email could not be sent' }); } }
  return res.json({ msg: 'If this account exists, a password reset code has been sent' });
};
exports.resetPassword = async (req, res) => {
  const email = normalizeEmail(req.body.email); const { otp, newPassword } = req.body;
  if (!validPassword(newPassword)) return res.status(400).json({ msg: 'Use a password of at least 8 characters' });
  const record = await liveOTP(email, otp, 'reset');
  if (!record) return res.status(400).json({ msg: 'Invalid or expired OTP' });
  const result = await User.updateOne({ email }, { $set: { password: await bcrypt.hash(newPassword, 10) } });
  if (!result.matchedCount) return res.status(404).json({ msg: 'Account not found' });
  await OTP.deleteMany({ email, purpose: 'reset' });
  return res.json({ msg: 'Password reset successful' });
};
