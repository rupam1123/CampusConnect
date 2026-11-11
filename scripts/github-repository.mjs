import { spawnSync } from 'node:child_process';

const input = 'protocol=https\nhost=github.com\n\n';
const result = spawnSync('git', ['credential', 'fill'], { input, encoding: 'utf8', windowsHide: true, timeout: 60000 });
if (result.status !== 0) { console.error('GitHub authentication is not available. Sign in with Git Credential Manager and retry.'); process.exit(1); }
const fields = Object.fromEntries(result.stdout.split(/\r?\n/).filter(line => line.includes('=')).map(line => { const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1)]; }));
if (!fields.password) { console.error('No GitHub credential was returned.'); process.exit(1); }
const headers = { Authorization: `Bearer ${fields.password}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' };
const me = await fetch('https://api.github.com/user', { headers });
if (!me.ok) { console.error(`GitHub authentication failed (${me.status}).`); process.exit(1); }
const account = await me.json();
if (account.login.toLowerCase() !== 'rupam1123') { console.error(`The signed-in GitHub account is ${account.login}; expected rupam1123.`); process.exit(1); }
const existing = await fetch('https://api.github.com/repos/rupam1123/CampusConnect', { headers });
if (existing.ok) { console.log((await existing.json()).html_url); process.exit(0); }
if (existing.status !== 404) { console.error(`Repository lookup failed (${existing.status}).`); process.exit(1); }
const created = await fetch('https://api.github.com/user/repos', { method: 'POST', headers, body: JSON.stringify({ name: 'CampusConnect', description: 'CampusConnect by Rupam — campus courses, discussions, feedback, projects and forum. Full-stack ChatGPT Sites deployment.', private: false, auto_init: false }) });
if (!created.ok) { console.error(`Repository creation failed (${created.status}): ${(await created.json()).message}`); process.exit(1); }
console.log((await created.json()).html_url);
