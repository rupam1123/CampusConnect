import { build } from 'esbuild';
import { mkdir, readFile, writeFile, readdir, copyFile, cp } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const vite = spawnSync(process.execPath, [path.resolve('frontend/node_modules/vite/bin/vite.js'), 'build'], { cwd: path.resolve('frontend'), env: { ...process.env, VITE_HOSTED_SITES: 'true', VITE_API_BASE: '' }, stdio: 'inherit' });
if (vite.status !== 0) process.exit(vite.status || 1);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
const assets = {};
async function collect(directory, prefix = '') {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, item.name);
    const key = `${prefix}/${item.name}`;
    if (item.isDirectory()) await collect(file, key);
    else assets[key] = { type: types[path.extname(file)] || 'application/octet-stream', body: (await readFile(file)).toString('base64') };
  }
}
await collect('frontend/dist');
await writeFile('hosted/generated-assets.mjs', `export const assets = ${JSON.stringify(assets)};\n`);
await mkdir('dist/server', { recursive: true });
await mkdir('dist/.openai', { recursive: true });
await build({ entryPoints: ['hosted/worker.mjs'], outfile: 'dist/server/index.js', bundle: true, format: 'esm', platform: 'neutral', mainFields: ['module', 'main'], target: 'es2022', minify: true, external: ['node:async_hooks'], alias: { xlsx: path.resolve('backend/node_modules/xlsx/xlsx.mjs'), mongoose: path.resolve('hosted/store.mjs'), bcrypt: path.resolve('hosted/crypto-stub.cjs'), jsonwebtoken: path.resolve('hosted/crypto-stub.cjs') }, define: { 'process.env.JWT_SECRET': 'undefined', 'process.env.ADMIN_PASSWORD': 'undefined' } });
await copyFile('.openai/hosting.json', 'dist/.openai/hosting.json');
await cp('drizzle', 'dist/drizzle', { recursive: true });
await writeFile('dist/server/wrangler.json', JSON.stringify({ name: 'campusconnect-rupam', main: 'index.js', compatibility_date: '2026-03-01', compatibility_flags: ['nodejs_compat'], d1_databases: [{ binding: 'DB', database_name: 'campusconnect', database_id: 'local', migrations_dir: '../drizzle' }] }, null, 2));
console.log('Built frontend and ChatGPT-hosted backend with D1 migrations.');
