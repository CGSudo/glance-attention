import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const app = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(app);
const host = execFileSync('rustc', ['-vV'], { encoding: 'utf8' }).match(/^host: (.+)$/m)[1].trim();
const target = process.env.TAURI_ENV_TARGET_TRIPLE || host;
assert.match(target, /^(x86_64|aarch64)-(pc-windows-msvc|apple-darwin)$/, 'Unsupported desktop target');
const args = ['build', '--locked', '--release', '-p', 'glance-cli'];
if (target !== host) args.push('--target', target);
execFileSync('cargo', args, { cwd: root, stdio: 'inherit' });
const release = path.join(root, 'target', ...(target === host ? [] : [target]), 'release');
const binaries = path.join(app, 'src-tauri', 'binaries');
mkdirSync(binaries, { recursive: true });
const extension = target.includes('windows') ? '.exe' : '';
copyFileSync(path.join(release, `glance${extension}`), path.join(binaries, `glance-${target}${extension}`));
if (target.includes('windows')) {
  const native = path.join(app, 'src-tauri', 'native');
  mkdirSync(native, { recursive: true });
  copyFileSync(path.join(release, 'DirectML.dll'), path.join(native, 'DirectML.dll'));
}
