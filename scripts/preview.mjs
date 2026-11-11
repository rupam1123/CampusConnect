import http from 'node:http';
import { mkdirSync } from 'node:fs';
import { localD1 } from './d1-local.mjs';
import worker from '../dist/server/index.js';

mkdirSync('outputs', { recursive: true });
const DB = localD1('outputs/preview.sqlite');
const env = { DB, OWNER_EMAIL: 'drupam1289@gmail.com' };
// Local QA only. This bridge and its simulated identity are never bundled or deployed.
const server = http.createServer(async (req, res) => {
  try {
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    const headers = new Headers(req.headers);
    headers.set('oai-authenticated-user-id', 'local-rupam-preview');
    headers.set('oai-authenticated-user-email', env.OWNER_EMAIL);
    const request = new Request(`http://127.0.0.1:4173${req.url}`, { method: req.method, headers, ...(!['GET', 'HEAD'].includes(req.method) ? { body: Buffer.concat(chunks) } : {}) });
    const response = await worker.fetch(request, env);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) { res.writeHead(500); res.end(error.message); }
});
server.listen(4173, '127.0.0.1', () => console.log('Local QA preview: http://127.0.0.1:4173'));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => { DB.close(); process.exit(0); }));
