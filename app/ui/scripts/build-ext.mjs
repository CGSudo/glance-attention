import { build } from 'vite';
import { readFile, writeFile, copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { copyRuntime, copyModel } from './web-assets.mjs';

const root = resolve('../../integrations/browser-extension');
const manifest = JSON.parse(await readFile(`${root}/manifest.json`, 'utf8'));
for (const browser of ['chrome', 'firefox']) {
  const destination = resolve(`../../dist/${browser}`);
  await build({
    configFile: false, root, base: './', publicDir: false,
    resolve: { conditions: ['onnxruntime-web-use-extern-wasm'] },
    worker: { format: 'es' },
    build: { outDir: destination, emptyOutDir: true, rollupOptions: {
      input: { result: `${root}/result.html`, options: `${root}/options.html`, background: `${root}/background.js` },
      output: { entryFileNames: chunk => chunk.name === 'background' ? 'background.js' : 'assets/[name]-[hash].js' },
    } },
  });
  const output = structuredClone(manifest);
  if (browser === 'firefox') output.background = { scripts: ['background.js'] };
  else delete output.browser_specific_settings;
  await writeFile(`${destination}/manifest.json`, JSON.stringify(output, null, 2));
  await copyRuntime(destination);
  await copyModel('unisal', `${destination}/models`);
  await copyFile('../../docs/app/models/NOTICE', `${destination}/models/NOTICE`);
  execFileSync(process.execPath, [process.env.npm_execpath, 'exec', '--yes', '--package=web-ext@8.10.0', '--', 'web-ext', 'build', '--source-dir', destination, '--artifacts-dir', resolve('../../dist'), '--filename', `${browser}.zip`, '--overwrite-dest'], { stdio: 'inherit' });
}
