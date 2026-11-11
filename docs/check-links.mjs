import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = path.dirname(fileURLToPath(import.meta.url));
const base = 'https://cgsudo.github.io/glance-attention/';
const files = [];
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(file);
    else if (entry.name.endsWith('.html')) files.push(file);
  }
}
function targetFor(value, from) {
  const current = new URL(path.relative(root, from).split(path.sep).join('/'), base);
  const target = new URL(value.replaceAll('&amp;', '&'), current);
  const site = new URL(base);
  if (target.origin !== site.origin || !target.pathname.startsWith(site.pathname)) return null;
  const relative = decodeURIComponent(target.pathname.slice(site.pathname.length));
  const file = path.resolve(root, relative || 'index.html');
  if (file !== root && !file.startsWith(root + path.sep)) throw Error('Path escapes docs');
  return { file, hash: decodeURIComponent(target.hash.slice(1)) };
}
assert.equal(targetFor('../science.html#main', path.join(root, 'compare/index.html')).file, path.join(root, 'science.html'));
assert.equal(targetFor('https://example.org/', path.join(root, 'index.html')), null);
assert.equal(targetFor('mailto:test@example.org', path.join(root, 'index.html')), null);
await walk(root);
assert.ok(files.length, 'No HTML files found');
const errors = [];
let links = 0;
for (const from of files) {
  const content = await readFile(from, 'utf8');
  // shortcut: authored HTML uses quoted href/src/content attributes; use an HTML parser if templates introduce unquoted attributes.
  const refs = [...content.matchAll(/\b(?:href|src)\s*=\s*(["'])(.*?)\1/gi)].map(m => m[2]);
  for (const tag of content.matchAll(/<meta\b[^>]*>/gi)) {
    if (/\b(?:property|name)=["'](?:og:image|twitter:image)["']/i.test(tag[0])) {
      const value = tag[0].match(/\bcontent=(["'])(.*?)\1/i);
      if (value) refs.push(value[2]);
    }
  }
  for (const ref of refs) {
    try {
      const target = targetFor(ref, from);
      if (!target) continue;
      links++;
      let info = await stat(target.file);
      if (info.isDirectory()) { target.file = path.join(target.file, 'index.html'); info = await stat(target.file); }
      assert.ok(info.isFile(), 'Not a file');
      if (target.hash) {
        const html = await readFile(target.file, 'utf8');
        const ids = [...html.matchAll(/\b(?:id|name)\s*=\s*(["'])(.*?)\1/gi)].map(m => m[2]);
        assert.ok(ids.includes(target.hash), `Missing fragment #${target.hash}`);
      }
    } catch (error) { errors.push(`${path.relative(root, from)}: ${ref}: ${error.message}`); }
  }
}
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log(`PASS: ${files.length} HTML files, ${links} internal references; all resolve.`);
