const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('node:http');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const User = require('./models/User');
const Session = require('./models/Session');
const Course = require('./models/Course');
const { member } = require('./middleware/courseAccess');

const app = express();
const server = http.createServer(app);
const allowedOrigins = [...new Set(['http://localhost:5173', 'http://127.0.0.1:5173', ...(process.env.FRONTEND_URL || '').split(',').map(value => value.trim()).filter(Boolean)])];
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '1mb' }));
const io = new Server(server, { cors: { origin: allowedOrigins, methods: ['GET','POST','PUT','DELETE'] } });
app.set('io', io);

io.use(async (socket, next) => {
  try {
    const decoded = jwt.verify(socket.handshake.auth?.token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || user.email !== decoded.email || user.role !== decoded.role) return next(new Error('Invalid session'));
    socket.data.user = { id: String(user._id), role: user.role };
    next();
  } catch { next(new Error('Authentication required')); }
});
io.on('connection', socket => {
  socket.on('join_room', async (sessionId, acknowledge) => {
    try {
      if (typeof sessionId !== 'string' || !mongoose.isValidObjectId(sessionId)) throw new Error('Invalid session');
      const session = await Session.findById(sessionId);
      const course = session && await Course.findById(session.course);
      if (!member(course, socket.data.user)) throw new Error('Course access denied');
      await socket.join(sessionId);
      if (typeof acknowledge === 'function') acknowledge({ ok: true });
    } catch { if (typeof acknowledge === 'function') acknowledge({ ok: false }); }
  });
});
app.get('/api/health', (req,res) => res.status(mongoose.connection.readyState === 1 ? 200 : 503).json({ status: mongoose.connection.readyState === 1 ? 'ok' : 'unavailable', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' }));
for (const [prefix,file] of [['auth','authRoutes'],['admin','adminRoutes'],['courses','courseRoutes'],['engage','discussionRoutes'],['projects','projectRoutes'],['forum','forumRoutes'],['users','userRoutes']]) app.use('/api/'+prefix, require('./routes/'+file));
app.use('/api', (req,res) => res.status(404).json({ msg:'API endpoint not found' }));
app.use(express.static(path.join(__dirname,'../frontend/dist')));
app.use((req,res,next) => req.method === 'GET' && !req.path.includes('.') ? res.sendFile(path.resolve(__dirname,'../frontend/dist/index.html')) : next());
app.use((err,req,res,next) => {
  if (res.headersSent) return next(err);
  if (err.name === 'CastError' || err.name === 'ValidationError' || err.type === 'entity.parse.failed') return res.status(400).json({ msg:'Invalid request data' });
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ msg:'Maximum upload size is 5 MB' });
  if (err.code === 11000) return res.status(409).json({ msg:'This record already exists' });
  console.error('Request failed:',err.message);
  return res.status(500).json({ msg:'Server error' });
});
async function start() {
  for (const name of ['MONGO_URI','JWT_SECRET','ADMIN_PASSWORD']) if (!process.env[name]) throw new Error(`Missing ${name}. Configure backend/.env; see backend/.env.example.`);
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  const port=Number(process.env.PORT || 5000);
  server.listen(port,() => console.log(`CampusConnect frontend, API and sockets: http://localhost:${port}`));
}
if (require.main === module) start().catch(error => { console.error(error.message); process.exit(1); });
module.exports = { app, server, start };
