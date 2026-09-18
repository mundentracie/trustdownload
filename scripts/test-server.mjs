// Zero-dependency static file server for the e2e tests (serves ./test on :8080).
// Replaces `npx http-server` so running tests never requires a registry download.
import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { join, extname } from 'path';

const ROOT = join(process.cwd(), 'test');
const PORT = 8080;

const MIME = {
  '.json': 'application/json',
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.txt': 'text/plain',
  '.png': 'image/png',
  '.zip': 'application/zip',
};

createServer(async (req, res) => {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  const rel = urlPath.replace(/^\/+/, '');
  const file = join(ROOT, rel);
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(body);
    return;
  } catch {
    /* fallthrough */
  }
  res.writeHead(404);
  res.end('not found');
}).listen(PORT, '127.0.0.1', () => {
  console.log(`test server on http://127.0.0.1:${PORT}`);
});
