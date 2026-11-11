import { storage, model } from './store.mjs';
import User from '../backend/models/User.js';
import Professor from '../backend/models/Professor.js';
import Course from '../backend/models/Course.js';
import Session from '../backend/models/Session.js';
import course from '../backend/controllers/courseController.js';
import discussion from '../backend/controllers/discussionController.js';
import project from '../backend/controllers/projectController.js';
import forum from '../backend/controllers/forumController.js';
import admin from '../backend/controllers/adminController.js';
import users from '../backend/controllers/userController.js';
import { member } from '../backend/middleware/courseAccess.js';
import { assets } from './generated-assets.mjs';

const json = (data, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
const fail = (status, msg) => { throw Object.assign(new Error(msg), { status }); };
const publicUser = user => ({ id: user._id, _id: user._id, role: user.role, email: user.email, name: user.name, username: user.username });
const routes = [];
function route(method, path, controller, access = {}) {
  const keys = [];
  const pattern = new RegExp('^' + path.replace(/:([\w]+)/g, (_, key) => { keys.push(key); return '([^/]+)'; }) + '/?$');
  routes.push({ method, pattern, keys, controller, access });
}
route('GET', '/api/courses/managed', course.getMyCourses, { role: 'Professor' });
route('GET', '/api/courses/enrolled', course.getEnrolledCourses);
route('GET', '/api/courses/:id/sessions', course.getCourseSessions, { course: true });
route('GET', '/api/courses/:id/sessions/unread-counts', course.getUnreadCounts, { course: true });
route('POST', '/api/courses', course.createCourse, { role: 'Professor' });
route('DELETE', '/api/courses/:id', course.deleteCourse, { course: true, owner: true });
route('POST', '/api/courses/:id/co-instructors', course.addCoInstructor, { course: true, manage: true });
route('POST', '/api/courses/:id/students/manual', course.addStudentManual, { course: true, manage: true });
route('POST', '/api/courses/:id/students/upload', course.addStudentsExcel, { course: true, manage: true });
route('GET', '/api/engage/session/:sessionId/comments', discussion.getComments, { session: true });
route('POST', '/api/engage/session/:sessionId/comments', discussion.postComment, { session: true });
route('POST', '/api/engage/session/:sessionId/mark-read', discussion.markSessionRead, { session: true });
route('GET', '/api/engage/session/:sessionId/feedback-status', discussion.checkFeedbackStatus, { session: true });
route('POST', '/api/engage/session/:sessionId/feedback', discussion.submitFeedback, { session: true, role: 'Student' });
route('GET', '/api/engage/course/:courseId/analytics', discussion.getCourseAnalytics, { course: true, manage: true });
route('POST', '/api/projects', project.createProject, { role: 'Professor' });
route('GET', '/api/projects/managed', project.getProfProjects, { role: 'Professor' });
route('PUT', '/api/projects/applications/:appId', project.updateApplicationStatus, { role: 'Professor' });
route('PUT', '/api/projects/:id', project.updateProject, { role: 'Professor' });
route('DELETE', '/api/projects/:id', project.deleteProject, { role: 'Professor' });
route('GET', '/api/projects/my-applications', project.getMyApplications, { role: 'Student' });
route('GET', '/api/projects', project.getAllProjects);
route('POST', '/api/projects/:projectId/apply', project.applyForProject, { role: 'Student' });
route('GET', '/api/forum/posts', forum.getAllPosts);
route('POST', '/api/forum/posts', forum.createPost);
route('POST', '/api/forum/posts/:postId/vote', forum.votePost);
route('GET', '/api/forum/posts/:postId/comments', forum.getComments);
route('POST', '/api/forum/posts/:postId/comments', forum.createComment);
route('POST', '/api/admin/add-professor', admin.addProfessor, { admin: true });
route('GET', '/api/admin/professors', admin.listProfessors, { admin: true });
route('DELETE', '/api/admin/professors/:id', admin.removeProfessor, { admin: true });
route('PUT', '/api/users/identity', users.updateIdentity);
route('POST', '/api/users/delete', users.deleteAccount);

async function handle(request, env) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/api/')) {
    const asset = assets[url.pathname] || (!url.pathname.split('/').pop().includes('.') ? assets['/index.html'] : null);
    if (!asset) return new Response('Not found', { status: 404 });
    const bytes = Uint8Array.from(atob(asset.body), c => c.charCodeAt(0));
    return new Response(bytes, { headers: { 'Content-Type': asset.type, 'Cache-Control': url.pathname.startsWith('/assets/') ? 'public,max-age=31536000,immutable' : 'no-cache', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin' } });
  }
  if (url.pathname === '/api/health') {
    await env.DB.prepare('SELECT 1 FROM records LIMIT 1').first();
    return json({ status: 'ok', database: 'connected', owner: 'Rupam', auth: 'chatgpt', realtime: 'polling' });
  }
  const identityId = request.headers.get('oai-authenticated-user-id');
  const email = request.headers.get('oai-authenticated-user-email')?.trim().toLowerCase();
  const signedIn = !!identityId && !!email;
  const isOwner = signedIn && email === env.OWNER_EMAIL?.toLowerCase();
  let user = signedIn ? await User.findOne({ identityId }) : null;
  if (url.pathname === '/api/auth/context' && request.method === 'GET') return json({ signedIn, email, isOwner, user: user ? publicUser(user) : null, token: user ? 'chatgpt-session' : null });
  if (!signedIn) fail(401, 'Sign in with ChatGPT to continue');
  if (!user && !email.endsWith('@gmail.com')) fail(403, 'Registration is available to Gmail users');
  if (!['GET', 'HEAD'].includes(request.method)) {
    const origin = request.headers.get('origin');
    if (origin && origin !== url.origin) fail(403, 'Request origin not allowed');
    if (Number(request.headers.get('content-length') || 0) > 5 * 1024 * 1024) fail(413, 'Maximum upload size is 5 MB');
  }
  if (url.pathname === '/api/auth/register' && request.method === 'POST') {
    if (user) return json({ user: publicUser(user), token: 'chatgpt-session' });
    const body = await request.json();
    if (!['Student', 'Professor'].includes(body.role)) fail(400, 'Choose Student or Professor');
    const approved = await Professor.findOne({ email });
    if (body.role === 'Professor' && !approved && !isOwner) fail(403, 'Ask Rupam to authorize your professor email first');
    if (body.role === 'Student' && approved) fail(403, 'This email is authorized for a professor account');
    if (body.role === 'Student' && !/^[a-zA-Z0-9_]{3,30}$/.test(body.username || '')) fail(400, 'Username must contain 3–30 letters, numbers or underscores');
    if (typeof body.name !== 'string' || !body.name.trim() || body.name.length > 100) fail(400, 'Enter your full name (up to 100 characters)');
    user = await User.create({ identityId, email, password: 'platform-managed', role: body.role, name: body.name.trim(), ...(body.role === 'Student' ? { username: body.username.trim() } : {}), isVerified: true });
    return json({ msg: 'Account created', token: 'chatgpt-session', user: publicUser(user) }, 201);
  }
  if (url.pathname === '/api/admin/login' && request.method === 'POST') {
    if (!isOwner) fail(403, 'Administrator access is restricted to Rupam');
    return json({ token: 'chatgpt-admin-session' });
  }
  const matchRoute = routes.find(item => item.method === request.method && item.pattern.test(url.pathname));
  if (!matchRoute) fail(404, 'API endpoint not found');
  const { access, controller, pattern, keys } = matchRoute;
  if (access.admin && !isOwner) fail(403, 'Administrator access required');
  if (!access.admin && !user) fail(403, 'Complete your profile first');
  if (access.role && user?.role !== access.role) fail(403, 'This action is not available for your role');
  const params = Object.fromEntries(pattern.exec(url.pathname).slice(1).map((value, i) => [keys[i], decodeURIComponent(value)]));
  if (Object.values(params).some(value => !/^[a-f0-9]{24}$/.test(value))) fail(400, 'Invalid record identifier');
  const req = { params, body: {}, platformIdentity: true, user: user ? { id: user._id, role: user.role, email } : null, app: { get: () => null } };
  if (access.course || access.session) {
    let courseId = params.id || params.courseId;
    if (access.session) { req.session = await Session.findById(params.sessionId); if (!req.session) fail(404, 'Session not found'); courseId = req.session.course; }
    req.course = await Course.findById(courseId);
    if (!req.course) fail(404, 'Course not found');
    if (!member(req.course, req.user, access.manage)) fail(403, 'You do not have access to this course');
    if (access.owner && String(req.course.professor) !== req.user.id) fail(403, 'Only the course owner can delete this course');
  }
  if (request.headers.get('content-type')?.includes('multipart/form-data')) {
    const file = (await request.formData()).get('file');
    if (file && file.size <= 5 * 1024 * 1024) req.file = { buffer: new Uint8Array(await file.arrayBuffer()) };
    else fail(400, 'Upload an Excel file up to 5 MB');
  } else if (!['GET', 'HEAD', 'DELETE'].includes(request.method)) {
    const raw = await request.text();
    if (raw.length > 1024 * 1024) fail(413, 'Request body is too large');
    try { req.body = raw.trim() ? JSON.parse(raw) : {}; }
    catch { fail(400, 'Request body must contain valid JSON'); }
  }
  let response;
  const res = { code: 200, status(code) { this.code = code; return this; }, json(data) { response = json(data, this.code); return this; } };
  await controller(req, res);
  return response || json({ msg: 'No response' }, 500);
}
export default {
  async fetch(request, env) {
    return storage.run(env, async () => {
      try { return await handle(request, env); }
      catch (error) {
        const duplicate = /UNIQUE constraint/.test(error.message);
        if (!error.status && !duplicate) console.error('Request failed:', error.message);
        return json({ msg: duplicate ? 'This account or record already exists' : error.status ? error.message : 'Server error. Please try again.' }, duplicate ? 409 : error.status || 500);
      }
    });
  }
};
