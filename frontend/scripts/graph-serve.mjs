// Serve graph/ over http so the map runs without the file:// origin warnings.
//   node scripts/graph-serve.mjs   (or: npm run graph:open)
// Regenerates the data first, then opens the browser.

import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { spawnSync, spawn } from 'node:child_process';

const DIR = join(process.cwd(), 'graph');
const PORT = 4173;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css' };

spawnSync(process.execPath, ['scripts/graphify.mjs'], { stdio: 'inherit' });

createServer((req, res) => {
  const name = (req.url === '/' ? '/index.html' : req.url).split('?')[0];
  const file = join(DIR, name);
  if (!file.startsWith(DIR) || !existsSync(file)) { res.writeHead(404); res.end('not found'); return; }
  res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
}).listen(PORT, () => {
  const url = `http://localhost:${PORT}/`;
  console.log(`Graphify map: ${url}  (Ctrl+C to stop)`);
  const open = process.platform === 'win32' ? ['cmd', ['/c', 'start', '', url]]
    : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]];
  try { spawn(open[0], open[1], { stdio: 'ignore', detached: true }).unref(); } catch { /* ignore */ }
});
