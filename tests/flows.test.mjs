import { test } from 'node:test';
import assert from 'node:assert/strict';
import { localD1 } from '../scripts/d1-local.mjs';
import worker from '../dist/server/index.js';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const xlsx = require('../backend/node_modules/xlsx');

const DB = localD1();
const env = { DB, OWNER_EMAIL: 'owner@gmail.com' };
const owner = { id: 'owner-identity', email: 'owner@gmail.com' };
const student = { id: 'student-identity', email: 'student@gmail.com' };
const outsider = { id: 'outsider-identity', email: 'outsider@gmail.com' };
const faculty = { id: 'faculty-identity', email: 'faculty@gmail.com' };
async function call(path, identity, method = 'GET', body) {
  const headers = {};
  if (identity) { headers['oai-authenticated-user-id'] = identity.id; headers['oai-authenticated-user-email'] = identity.email; }
  if (body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';
  const response = await worker.fetch(new Request(`https://campus.example${path}`, { method, headers, ...(body ? { body: body instanceof FormData ? body : JSON.stringify(body) } : {}) }), env);
  return { status: response.status, data: await response.json() };
}
async function ok(path, identity, method, body) { const result = await call(path, identity, method, body); assert.ok(result.status >= 200 && result.status < 300, `${path}: ${result.status} ${JSON.stringify(result.data)}`); return result.data; }

test('complete student, professor, course, discussion, feedback, project and admin flows', async t => {
  let course, session, project, application, post, comment;
  await t.test('frontend, database readiness and anonymous authorization', async () => {
    assert.equal((await call('/api/health')).data.database, 'connected');
    const page = await worker.fetch(new Request('https://campus.example/login'), env);
    assert.equal(page.status, 200); assert.match(await page.text(), /<div id="root">/);
    assert.equal((await call('/api/courses/enrolled')).status, 401);
    assert.equal((await call('/api/auth/register', { id: 'bad', email: 'x@other.com' }, 'POST', { role: 'Student', name: 'Bad', username: 'bad' })).status, 403);
  });
  await t.test('Gmail registration, stable identity and professor whitelist', async () => {
    await ok('/api/auth/register', owner, 'POST', { role: 'Professor', name: 'Rupam' });
    await ok('/api/auth/register', student, 'POST', { role: 'Student', name: 'Student', username: 'student' });
    await ok('/api/auth/register', outsider, 'POST', { role: 'Student', name: 'Outsider', username: 'outsider' });
    assert.equal((await call('/api/auth/register', faculty, 'POST', { role: 'Professor', name: 'Faculty' })).status, 403);
    await ok('/api/admin/add-professor', owner, 'POST', { email: faculty.email, name: 'Faculty' });
    await ok('/api/auth/register', faculty, 'POST', { role: 'Professor', name: 'Faculty' });
    assert.equal((await call('/api/admin/professors', student)).status, 403);
    assert.equal((await call('/api/auth/context', student)).data.user.username, 'student');
    const rows = DB.sqlite.prepare("SELECT data FROM records WHERE collection='User'").all();
    assert.equal(rows.length, 4); assert.equal(rows.filter(row => JSON.parse(row.data).role === 'Professor').length, 2);
  });
  await t.test('course creation, scheduling, enrollment and access isolation', async () => {
    const day = new Date(Date.now() + 3 * 86400000); const date = day.toISOString().slice(0, 10);
    const weekday = day.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
    assert.equal((await call('/api/courses', student, 'POST', { name: 'No' })).status, 403);
    course = (await ok('/api/courses', owner, 'POST', { name: 'CS 253', startDate: date, endDate: date, daysOfWeek: [weekday] })).course;
    const sessions = await ok(`/api/courses/${course._id}/sessions`, owner); assert.equal(sessions.length, 1); session = sessions[0];
    assert.equal((await call(`/api/courses/${course._id}/sessions`, outsider)).status, 403);
    await ok(`/api/courses/${course._id}/students/manual`, owner, 'POST', { email: ' Student@Gmail.com ' });
    assert.equal((await ok('/api/courses/enrolled', student)).length, 1);
    assert.equal((await call(`/api/courses/${course._id}`, student, 'DELETE')).status, 403);
    assert.equal((await call(`/api/courses/${course._id}`, faculty, 'DELETE')).status, 403);
    assert.equal((await ok('/api/courses/managed', owner))[0].professor.name, 'Rupam');
  });
  await t.test('Excel bulk enrollment and co-instructor management', async () => {
    const wb = xlsx.utils.book_new(); xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet([{ Email: outsider.email }, { Email: outsider.email }, { Email: 'missing@gmail.com' }]), 'Students');
    const form = new FormData(); form.set('file', new File([xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' })], 'students.xlsx'));
    const result = await ok(`/api/courses/${course._id}/students/upload`, owner, 'POST', form);
    assert.equal(result.summary.added, 1); assert.equal(result.summary.skipped, 1);
    await ok(`/api/courses/${course._id}/co-instructors`, owner, 'POST', { email: faculty.email });
    assert.equal((await ok('/api/courses/managed', faculty)).length, 1);
  });
  await t.test('discussion replies, unread status and verified session membership', async () => {
    comment = await ok(`/api/engage/session/${session._id}/comments`, student, 'POST', { text: 'Can you explain this topic?' });
    await ok(`/api/engage/session/${session._id}/comments`, owner, 'POST', { text: 'Yes, let us discuss it.', replyTo: comment._id });
    const comments = await ok(`/api/engage/session/${session._id}/comments`, student); assert.equal(comments.length, 2); assert.equal(comments[1].replyTo.text, comment.text);
    await ok(`/api/engage/session/${session._id}/mark-read`, student, 'POST', {});
    assert.equal((await ok(`/api/courses/${course._id}/sessions/unread-counts`, student))[session._id], 0);
  });
  await t.test('feedback validation, duplicate protection and analytics', async () => {
    assert.equal((await call(`/api/engage/session/${session._id}/feedback`, student, 'POST', { ratings: {} })).status, 400);
    await ok(`/api/engage/session/${session._id}/feedback`, student, 'POST', { ratings: { content: 5, delivery: 4, clarity: 5, engagement: 4, pace: 3 }, courseId: 'forged-course', comment: 'Helpful session' });
    assert.equal((await ok(`/api/engage/session/${session._id}/feedback-status`, student)).submitted, true);
    assert.equal((await call(`/api/engage/course/${course._id}/analytics`, student)).status, 403);
    const analytics = await ok(`/api/engage/course/${course._id}/analytics`, owner); assert.equal(analytics.count, 1); assert.equal(analytics.averages.content, '5.0');
  });
  await t.test('project application, ownership checks and status review', async () => {
    project = await ok('/api/projects', owner, 'POST', { title: 'Campus Project', description: 'Build a useful tool', branches: ['ALL'], batches: ['ALL'], cpi: 6, skills: 'React', duration: '4 weeks' });
    assert.equal((await ok('/api/projects', student)).length, 1);
    application = (await ok(`/api/projects/${project._id}/apply`, student, 'POST', { rollNo: '12345', name: 'Student', branch: 'CSE', batch: '2026', cpi: 8, resume: 'https://example.com/resume' })).application;
    assert.equal((await call(`/api/projects/applications/${application._id}`, faculty, 'PUT', { status: 'Accepted' })).status, 403);
    await ok(`/api/projects/applications/${application._id}`, owner, 'PUT', { status: 'Accepted' });
    assert.equal((await ok('/api/projects/my-applications', student))[0].status, 'Accepted');
    assert.equal((await ok('/api/projects/managed', owner))[0].applicants.length, 1);
  });
  await t.test('forum posting, comments, votes and account identity updates', async () => {
    post = await ok('/api/forum/posts', student, 'POST', { title: 'Welcome', content: 'Hello campus!', tag: 'General' });
    await ok(`/api/forum/posts/${post._id}/comments`, owner, 'POST', { content: 'Welcome!' });
    await ok(`/api/forum/posts/${post._id}/vote`, owner, 'POST', { voteType: 'up' });
    const posts = await ok('/api/forum/posts', student); assert.equal(posts[0].upvoteCount, 2); assert.equal(posts[0].commentsCount, 1);
    assert.equal((await ok('/api/users/identity', student, 'PUT', { newIdentity: 'student_updated' })).user.id.length, 24);
  });
  await t.test('destructive operations require owner and explicit confirmation', async () => {
    assert.equal((await call('/api/users/delete', owner, 'POST', { password: 'DELETE' })).status, 409);
    assert.equal((await call('/api/users/delete', student, 'POST', { password: 'wrong' })).status, 400);
    await ok('/api/users/delete', outsider, 'POST', { password: 'DELETE' });
    assert.equal((await ok('/api/auth/context', outsider)).user, null);
    await ok(`/api/projects/${project._id}`, owner, 'DELETE');
    await ok(`/api/courses/${course._id}`, owner, 'DELETE');
    assert.equal(DB.sqlite.prepare("SELECT count(*) AS count FROM records WHERE collection IN ('Session','Comment','Feedback','UserSessionRead')").get().count, 0);
    assert.equal(DB.sqlite.prepare("SELECT count(*) AS count FROM records WHERE collection='User'").get().count, 4);
  });
  DB.close();
});
