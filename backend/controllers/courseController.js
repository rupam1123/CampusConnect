const Course = require("../models/Course");
const Session = require("../models/Session");
const User = require("../models/User");
const xlsx = require("xlsx");

// Helper to generate dates between start and end based on days of week
const generateSessions = async (courseId, startDate, endDate, daysOfWeek) => {
  const dayMap = { "Sunday": 0, "Monday": 1, "Tuesday": 2, "Wednesday": 3, "Thursday": 4, "Friday": 5, "Saturday": 6 };
  const targetDays = daysOfWeek.map(d => dayMap[d]);
  
  let currentDate = new Date(startDate);
  const end = new Date(endDate);
  const sessionsToCreate = [];

  while (currentDate <= end) {
    if (targetDays.includes(currentDate.getDay())) {
      sessionsToCreate.push({ course: courseId, date: new Date(currentDate) });
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  if (sessionsToCreate.length > 0) {
    await Session.insertMany(sessionsToCreate);
  }
};

// [F3] Create Course
exports.createCourse = async (req, res) => {
  try {
    const { name, startDate, endDate, daysOfWeek } = req.body;
    const professorId = req.user.id; // Assuming auth middleware attaches req.user

    if (typeof name !== 'string' || !name.trim() || !startDate || !endDate || !Array.isArray(daysOfWeek) || daysOfWeek.length === 0) {
      return res.status(400).json({ msg: "All fields are required" });
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    const validDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || daysOfWeek.some(day => !validDays.includes(day)) || end - start > 366 * 86400000) {
      return res.status(400).json({ msg: 'Use valid dates, weekdays, and a schedule of at most one year' });
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (start < today) {
      return res.status(400).json({ msg: "Start date cannot be in the past" });
    }

    if (end < start) {
      return res.status(400).json({ msg: "End date must be after start date" });
    }

    const course = await Course.create({
      name,
      startDate,
      endDate,
      daysOfWeek,
      professor: professorId
    });

    await generateSessions(course._id, startDate, endDate, daysOfWeek);

    res.status(201).json({ msg: "Course created and sessions scheduled", course });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server Error" });
  }
};

// [F3] Delete Course
// [F3] Delete Course (Updated for F5 & F8 Cascading Deletes)
exports.deleteCourse = async (req, res) => {
  try {
    const courseId = req.params.id;
    
    // 1. Find all sessions for this course
    const sessions = await Session.find({ course: courseId });
    const sessionIds = sessions.map(s => s._id);

    // 2. Delete all Comments and Feedback linked to those sessions
    const Comment = require("../models/Comment");
    const Feedback = require("../models/Feedback");
    await Comment.deleteMany({ session: { $in: sessionIds } });
    await Feedback.deleteMany({ session: { $in: sessionIds } });
    await require('../models/UserSessionRead').deleteMany({ session: { $in: sessionIds } });

    // 3. Delete the sessions and the course itself
    await Session.deleteMany({ course: courseId });
    await Course.findByIdAndDelete(courseId);
    
    res.json({ msg: "Course, sessions, comments, and feedback permanently deleted" });
  } catch (err) {
    res.status(500).json({ msg: "Server Error during deletion" });
  }
};

// [F3] Add Co-Instructor
exports.addCoInstructor = async (req, res) => {
  try {
    const { email } = req.body;
    const courseId = req.params.id;

    if (typeof email !== 'string' || !email.trim()) return res.status(400).json({ msg: 'Email required' });
    const user = await User.findOne({ email: email.trim().toLowerCase(), role: "Professor" });
    if (!user) return res.status(404).json({ msg: "Professor email not found in system" });

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ msg: 'Course not found' });
    if (course.coInstructors.map(String).includes(String(user._id)) || String(course.professor) === String(user._id)) {
      return res.status(400).json({ msg: "Professor is already associated with this course" });
    }

    course.coInstructors.push(user._id);
    await course.save();

    res.json({ msg: "Co-instructor added successfully", user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ msg: "Server Error" });
  }
};

// [F4] Manual Add Student
exports.addStudentManual = async (req, res) => {
  try {
    const { email } = req.body;
    const courseId = req.params.id;

    if (typeof email !== 'string' || !email.trim()) return res.status(400).json({ msg: 'Email required' });
    const user = await User.findOne({ email: email.trim().toLowerCase(), role: "Student" });
    if (!user) return res.status(404).json({ msg: "Student email not found in system" });

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ msg: 'Course not found' });
    if (course.students.map(String).includes(String(user._id))) {
      return res.status(400).json({ msg: "Student already enrolled" });
    }

    course.students.push(user._id);
    await course.save();

    res.json({ msg: "Student added successfully", student: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ msg: "Server Error" });
  }
};

// [F4] Bulk Add Students via Excel
exports.addStudentsExcel = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ msg: "Please upload an Excel file" });
    const courseId = req.params.id;

    // Parse Excel Buffer
    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (data.length === 0) return res.status(400).json({ msg: "The Excel file is empty" });

    // Check for 'Email' column
    const firstRow = data[0];
    if (!Object.keys(firstRow).includes("Email")) {
      return res.status(400).json({ msg: "Missing 'Email' column in the uploaded file" });
    }

  // --- UPDATED EXCEL LOOP ---
    const course = await Course.findById(req.params.id);
    let addedCount = 0;
    let skippedEmails = [];
    
    // Create a Set of existing student IDs for O(1) lookup
    const existingStudentIds = new Set(course.students.map(id => id.toString()));
    // Create a Set to track emails already seen in THIS excel file to prevent double-counting fails
    const processedInThisBatch = new Set();

    for (const row of data) {
      const email = row["Email"];
      if (!email || typeof email !== "string") continue;

      const cleanEmail = email.trim().toLowerCase();
      
      // Skip if we've already dealt with this email in this specific upload
      if (processedInThisBatch.has(cleanEmail)) continue;
      processedInThisBatch.add(cleanEmail);

      const user = await User.findOne({ email: cleanEmail });

      if (!user) {
        // CASE: Email does not exist in the system
        skippedEmails.push({ email: cleanEmail, reason: "Account not found" });
      } else if (user.role !== "Student") {
        // CASE: Account exists but isn't a student (e.g. trying to add a professor as a student)
        skippedEmails.push({ email: cleanEmail, reason: "Not a student account" });
      } else if (existingStudentIds.has(user._id.toString())) {
        // CASE: Duplicate entry (Already in this course)
        skippedEmails.push({ email: cleanEmail, reason: "Already enrolled" });
      } else {
        // SUCCESS: Add student
        course.students.push(user._id);
        existingStudentIds.add(user._id.toString()); // Update local set
        addedCount++;
      }
    }

    await course.save();
    // Return the response
    res.json({ 
      msg: "Upload processed", 
      summary: { 
        added: addedCount, 
        skipped: skippedEmails.length, 
        skippedEmails 
      } 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Error processing Excel file" });
  }
};

// Get Professor's Courses
exports.getMyCourses = async (req, res) => {
  try {
    const courses = await Course.find({ 
      $or: [{ professor: req.user.id }, { coInstructors: req.user.id }] 
    })
    .populate("professor", "name email")
    .populate("students", "name email username")
    .populate("coInstructors", "name email");
    res.json(courses);
  } catch (err) {
    res.status(500).json({ msg: "Server Error" });
  }
};
// [F4] Get Student's Enrolled Courses
exports.getEnrolledCourses = async (req, res) => {
  try {
    // Find courses where the students array contains the current user's ID
    const courses = await Course.find({ students: req.user.id })
      .populate("professor", "name")
      .populate("coInstructors", "name");
    res.json(courses);
  } catch (err) {
    res.status(500).json({ msg: "Server error fetching enrolled courses" });
  }
};

// [F5] Get Sessions for a specific course
exports.getCourseSessions = async (req, res) => {
  try {
    // Find all sessions for a course and sort them chronologically
    const sessions = await Session.find({ course: req.params.id }).sort({ date: 1 });
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ msg: "Server error fetching sessions" });
  }
};

// [F5] Get unread comment counts per session for a course (server-side, WhatsApp-style)
// Returns: { "<sessionId>": <unreadCount>, ... }
exports.getUnreadCounts = async (req, res) => {
  try {
    const Comment = require("../models/Comment");
    const UserSessionRead = require("../models/UserSessionRead");

    // Get all sessions for this course
    const sessions = await Session.find({ course: req.params.id }).select("_id");
    const sessionIds = sessions.map(s => s._id);

    // Fetch this user's last-seen records for these sessions in one query
    const readRecords = await UserSessionRead.find({
      user: req.user.id,
      session: { $in: sessionIds },
    }).select("session lastSeenAt");

    // Build a map: sessionId -> lastSeenAt (or epoch 0 if never seen)
    const seenMap = {};
    readRecords.forEach(r => { seenMap[r.session.toString()] = r.lastSeenAt; });

    // Count comments newer than lastSeenAt for each session
    const result = {};
    await Promise.all(sessionIds.map(async (sid) => {
      const lastSeen = seenMap[sid.toString()] || new Date(0);
      const count = await Comment.countDocuments({
        session: sid,
        createdAt: { $gt: lastSeen },
      });
      result[sid.toString()] = count;
    }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error fetching unread counts" });
  }
};
