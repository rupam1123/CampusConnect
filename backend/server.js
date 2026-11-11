// backend/server.js
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http"); // <-- NEW: Required for Socket.io
const { Server } = require("socket.io"); // <-- NEW: Required for Socket.io

const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const courseRoutes = require("./routes/courseRoutes");
const discussionRoutes = require("./routes/discussionRoutes");

const app = express();
const allowedOrigins = [
  "http://172.27.16.252",
  "http://localhost:5173", // for dev
];

// app.use(cors({
//   origin: function (origin, callback) {
//     if (!origin || allowedOrigins.includes(origin)) {
//       callback(null, true);
//     } else {
//       callback(new Error("Not allowed by CORS"));
//     }
//   },
//   credentials: true
// }));
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

// ==========================================
// 1. SOCKET.IO SERVER SETUP
// ==========================================
const server = http.createServer(app); // Wrap the express app
const io = new Server(server, {
  cors: {
    origin: true,
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

// Make the 'io' instance available in all your controllers (req.app.get("io"))
app.set("io", io);

// Handle WebSockets connections
io.on("connection", (socket) => {
  console.log(`Socket Connected: ${socket.id}`);

  // When frontend triggers 'join_room', put this socket into that specific session's room
  socket.on("join_room", (sessionId) => {
    socket.join(sessionId);
    console.log(`Socket ${socket.id} joined room: ${sessionId}`);
  });

  socket.on("disconnect", () => {
    console.log(`Socket Disconnected: ${socket.id}`);
  });
});
// ==========================================

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  });

// Routes
app.use("/api/projects", require("./routes/projectRoutes"));
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use('/api/forum', require('./routes/forumRoutes'));
app.use("/api/courses", courseRoutes);
app.use("/api/engage", discussionRoutes);
app.use('/api/users', require('./routes/userRoutes'));

const path = require("path");

// Serve static files FIRST
// Serve static files FIRST
app.use(express.static(path.join(__dirname, "../frontend/dist")));

// Fallback for React routes (NO "*")
app.use((req, res, next) => {
  if (req.path.startsWith("/api") || req.path.includes(".")) {
    return next();
  }
  res.sendFile(path.resolve(__dirname, "../frontend/dist/index.html"));
});

// ==========================================
// 2. START THE WRAPPED SERVER (Not app.listen!)
// ==========================================
server.listen(PORT, () => console.log(`Server & Sockets running on port ${PORT}`));