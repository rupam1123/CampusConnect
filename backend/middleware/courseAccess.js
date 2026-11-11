const Course = require('../models/Course');
const Session = require('../models/Session');

const member = (course, user, manage = false) => {
  if (!course || !user?.id) return false;
  const instructors = [course.professor, ...(course.coInstructors || [])].map(String);
  if (user.role === 'Professor' && instructors.includes(String(user.id))) return true;
  return !manage && user.role === 'Student' && course.students.map(String).includes(String(user.id));
};
const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) return res.status(403).json({ msg: 'This action is not available for your role' });
  next();
};
const courseAccess = (manage = false, session = false) => async (req, res, next) => {
  let id = req.params.id || req.params.courseId;
  if (session) {
    const record = await Session.findById(req.params.sessionId);
    if (!record) return res.status(404).json({ msg: 'Session not found' });
    req.session = record;
    id = record.course;
  }
  const course = await Course.findById(id);
  if (!course) return res.status(404).json({ msg: 'Course not found' });
  if (!member(course, req.user, manage)) return res.status(403).json({ msg: 'You do not have access to this course' });
  req.course = course;
  next();
};
module.exports = { member, requireRole, courseAccess };
