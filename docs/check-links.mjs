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
const titles = new Set();
const descriptions = new Set();
const sitemap = await readFile(path.join(root, 'sitemap.xml'), 'utf8');
let links = 0;
for (const from of files) {
  const content = await readFile(from, 'utf8');
  try {
    const title = content.match(/<title>(.*?)<\/title>/is)?.[1].trim();
    const description = content.match(/<meta\s+name="description"\s+content="([^"]+)"/i)?.[1].trim();
    assert.ok(title && description, 'Missing title or description');
    assert.ok(!titles.has(title), `Duplicate title: ${title}`);
    assert.ok(!descriptions.has(description), `Duplicate description: ${description}`);
    titles.add(title);
    descriptions.add(description);
    for (const block of content.matchAll(/<script\s+type="application\/ld\+json">(.*?)<\/script>/gis)) JSON.parse(block[1]);
    const relative = path.relative(root, from).split(path.sep).join('/');
    if (/^(alternatives\/|guides\/|best-free-attention-heatmap-tools\.html$)/.test(relative)) {
      assert.ok(sitemap.includes(`<loc>${base}${relative}</loc>`), 'Missing sitemap entry');
      assert.ok(content.includes('<meta name="robots" content="index,follow">'), 'Missing index,follow');
      assert.ok(content.includes(`rel="canonical" href="${base}${relative}"`), 'Incorrect canonical');
      assert.ok(!/\d+%\s*accura/i.test(content), 'Unattributed accuracy percentage; review before publication');
      if (relative.startsWith('guides/')) {
        const article = content.split('</h1>')[1].split('<section><h2>Frequently asked questions')[0];
        const words = article.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).length;
        assert.ok(words >= 500 && words <= 800, `Guide body has ${words} words; expected 500–800`);
      }
    }
  } catch (error) { errors.push(`${path.relative(root, from)}: ${error.message}`); }
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
else console.log(`PASS: ${files.length} HTML files, ${links} internal references; links, unique metadata, JSON-LD and new-page SEO checks pass.`);
