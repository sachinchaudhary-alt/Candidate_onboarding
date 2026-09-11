// Graphify — scan src/ and build a code graph so the whole project can be
// understood from one map instead of opening every file.
//
//   node scripts/graphify.mjs      (or: npm run graph)
//
// Writes into graph/:
//   graph.json      machine-readable graph (nodes + edges + stats)
//   graph-data.js   the same graph as `window.GRAPH` for the offline UI
//   GRAPH.md        a readable digest — read this instead of scanning src/
//
// No dependencies: imports/exports are read with plain regex, which is enough
// for this codebase (standard ES module syntax throughout).

import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, relative, dirname, resolve } from 'node:path';

const ROOT = process.cwd();
const SRC = join(ROOT, 'src');
const OUT_DIR = join(ROOT, 'graph');
const APP_NAME = readJson('package.json')?.name || 'app';

// ---------------------------------------------------------------- helpers -----

const slash = (p) => p.split('\\').join('/');
const rel = (full) => slash(relative(ROOT, full));

function readJson(p) {
  try { return JSON.parse(readFileSync(join(ROOT, p), 'utf8')); } catch { return null; }
}

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, acc);
    else if (/\.(jsx?|css)$/.test(name)) acc.push(full);
  }
  return acc;
}

// Which slice of the app a file belongs to. Drives colour + grouping in the UI.
function layerOf(id) {
  if (id.endsWith('.css')) return 'style';
  if (/^src\/(main|App)\.jsx?$/.test(id)) return 'entry';
  if (id.startsWith('src/pages/')) return 'page';
  if (id.startsWith('src/layouts/')) return 'layout';
  if (id.startsWith('src/routes/') || id.startsWith('src/components/routing/')) return 'route';
  if (id.startsWith('src/components/navigation/')) return 'navigation';
  if (id.startsWith('src/components/')) return 'component';
  if (id.startsWith('src/hooks/')) return 'hook';
  if (id.startsWith('src/context/')) return 'context';
  if (id.startsWith('src/utils/')) return 'util';
  if (id.startsWith('src/constants/')) return 'constant';
  if (id.startsWith('src/data/')) return 'data';
  return 'other';
}

function tidy(s) {
  return s.replace(/\s*\n\s*\*?\s*/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 240);
}

// The first comment at the top of a file, used as its one-line description.
function summarize(src) {
  const body = src.replace(/^\uFEFF/, '').trimStart();
  const block = body.match(/^\/\*+([\s\S]*?)\*\//);
  if (block) return tidy(block[1]);
  const lines = [];
  for (const raw of body.split('\n')) {
    const t = raw.trim();
    if (t.startsWith('//')) lines.push(t.replace(/^\/\/+/, '').trim());
    else if (lines.length || t === '') { if (lines.length) break; }
    else break;
  }
  return lines.length ? tidy(lines.join(' ')) : '';
}

function exportsOf(src) {
  const out = new Set();
  const def = src.match(/export\s+default\s+(?:function|class)?\s*([A-Za-z0-9_]+)?/);
  if (def) out.add(def[1] ? `default (${def[1]})` : 'default');
  let m;
  const named = /export\s+(?:async\s+)?(?:const|let|var|function|class)\s+([A-Za-z0-9_]+)/g;
  while ((m = named.exec(src))) out.add(m[1]);
  const listed = /export\s*\{([^}]+)\}/g;
  while ((m = listed.exec(src))) {
    for (let part of m[1].split(',')) {
      part = part.trim().split(/\s+as\s+/).pop().trim();
      if (part && part !== 'default') out.add(part);
    }
  }
  return [...out];
}

function specifiersOf(src) {
  const specs = [];
  const re = /(?:import|export)\s+(?:[^'"]*?\sfrom\s+)?['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(src))) specs.push(m[1]);
  return specs;
}

// Turn a relative import string into a file id, trying the usual extensions.
function resolveImport(fromId, spec) {
  if (!spec.startsWith('.')) return null;
  const target = resolve(dirname(join(ROOT, fromId)), spec);
  const tries = [
    target, `${target}.jsx`, `${target}.js`, `${target}.css`,
    join(target, 'index.jsx'), join(target, 'index.js'),
  ];
  for (const c of tries) {
    try { if (statSync(c).isFile()) return rel(c); } catch { /* keep trying */ }
  }
  return null;
}

// Route table lifted straight from the <Route> JSX.
function readRoutes(files) {
  const routes = [];
  for (const id of files) {
    if (!/routes\/.*\.jsx$/.test(id) && !/AppRoutes/.test(id)) continue;
    const src = readFileSync(join(ROOT, id), 'utf8');
    const re = /<Route\s+path="([^"]+)"\s+element=\{<\s*([A-Za-z0-9_]+)/g;
    let m;
    while ((m = re.exec(src))) routes.push({ path: m[1], component: m[2] });
  }
  return routes;
}

// ------------------------------------------------------------------ build -----

const files = walk(SRC).map(rel).sort();
const nodes = new Map();

for (const id of files) {
  const src = readFileSync(join(ROOT, id), 'utf8');
  nodes.set(id, {
    id,
    name: id.split('/').pop(),
    dir: id.split('/').slice(0, -1).join('/'),
    layer: layerOf(id),
    loc: src.split('\n').length,
    summary: id.endsWith('.css') ? '' : summarize(src),
    exports: id.endsWith('.css') ? [] : exportsOf(src),
    externals: [...new Set(specifiersOf(src).filter((s) => !s.startsWith('.')))].sort(),
    imports: [],
    importedBy: [],
  });
}

const edges = [];
for (const id of files) {
  const src = readFileSync(join(ROOT, id), 'utf8');
  const seen = new Set();
  for (const spec of specifiersOf(src)) {
    const to = resolveImport(id, spec);
    if (!to || to === id || seen.has(to) || !nodes.has(to)) continue;
    seen.add(to);
    nodes.get(id).imports.push(to);
    nodes.get(to).importedBy.push(id);
    edges.push({ source: id, target: to });
  }
}

const layerCounts = {};
for (const n of nodes.values()) layerCounts[n.layer] = (layerCounts[n.layer] || 0) + 1;

const hubs = [...nodes.values()]
  .filter((n) => n.importedBy.length)
  .sort((a, b) => b.importedBy.length - a.importedBy.length)
  .slice(0, 12);

const orphans = [...nodes.values()]
  .filter((n) => !n.importedBy.length && !['entry', 'style'].includes(n.layer))
  .map((n) => n.id);

const graph = {
  app: APP_NAME,
  generatedAt: new Date().toISOString(),
  stats: {
    files: files.length,
    edges: edges.length,
    layers: layerCounts,
  },
  routes: readRoutes(files),
  hubs: hubs.map((n) => ({ id: n.id, importers: n.importedBy.length })),
  orphans,
  nodes: [...nodes.values()],
  edges,
};

// ------------------------------------------------------------------ write -----

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, 'graph.json'), JSON.stringify(graph, null, 2));
writeFileSync(join(OUT_DIR, 'graph-data.js'), `window.GRAPH = ${JSON.stringify(graph)};\n`);
writeFileSync(join(OUT_DIR, 'GRAPH.md'), renderMarkdown(graph));

console.log(`graphify: ${files.length} files, ${edges.length} edges -> graph/`);
console.log('  graph/GRAPH.md      read this instead of scanning src/');
console.log('  graph/index.html    open in a browser for the map');

// --------------------------------------------------------------- markdown -----

function renderMarkdown(g) {
  const date = g.generatedAt.slice(0, 10);
  const byLayer = {};
  for (const n of g.nodes) (byLayer[n.layer] ||= []).push(n);

  const out = [];
  out.push(`# Project graph — ${g.app}`);
  out.push('');
  out.push(`_Generated ${date} by \`scripts/graphify.mjs\`. ${g.stats.files} files, ${g.stats.edges} import edges._`);
  out.push('');
  out.push('**Read this file instead of scanning `src/`.** Regenerate after code changes with `npm run graph`.');
  out.push('');

  out.push('## Layers');
  out.push('');
  for (const [layer, count] of Object.entries(g.stats.layers).sort((a, b) => b[1] - a[1])) {
    out.push(`- \`${layer}\` — ${count}`);
  }
  out.push('');

  out.push('## Most depended-on files (hubs)');
  out.push('');
  for (const h of g.hubs) out.push(`- \`${h.id}\` — ${h.importers} importers`);
  out.push('');

  if (g.routes.length) {
    out.push('## Routes');
    out.push('');
    out.push('| path | component |');
    out.push('| --- | --- |');
    for (const r of g.routes) out.push(`| \`${r.path}\` | ${r.component} |`);
    out.push('');
  }

  if (g.orphans.length) {
    out.push('## Not imported anywhere');
    out.push('');
    for (const id of g.orphans) out.push(`- \`${id}\``);
    out.push('');
  }

  out.push('## Files by layer');
  out.push('');
  const order = ['entry', 'route', 'layout', 'navigation', 'page', 'component', 'hook', 'context', 'util', 'constant', 'data', 'style', 'other'];
  for (const layer of order) {
    const list = (byLayer[layer] || []).sort((a, b) => a.id.localeCompare(b.id));
    if (!list.length) continue;
    out.push(`### ${layer}`);
    out.push('');
    for (const n of list) {
      const exp = n.exports.length ? ` · exports: ${n.exports.join(', ')}` : '';
      out.push(`- **\`${n.id}\`**${n.summary ? ` — ${n.summary}` : ''}`);
      out.push(`  ${n.loc} loc · imports ${n.imports.length} · imported by ${n.importedBy.length}${exp}`);
      if (n.imports.length) out.push(`  imports: ${n.imports.map((i) => '`' + i + '`').join(', ')}`);
      if (n.importedBy.length) out.push(`  importedBy: ${n.importedBy.map((i) => '`' + i + '`').join(', ')}`);
    }
    out.push('');
  }

  return out.join('\n');
}
