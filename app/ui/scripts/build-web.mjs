import { build } from 'vite';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { copyRuntime, copyModel } from './web-assets.mjs';

await build({ mode: 'web' });
await copyRuntime('../../docs/app');
await mkdir('../../docs/app/models', { recursive: true });
await copyModel('unisal', '../../docs/app/models');
const license = await readFile('../../models/licenses/UNISAL-Apache-2.0.txt', 'utf8');
await writeFile('../../docs/app/models/NOTICE', `UNISAL — Apache-2.0\nDroste, Jiao, Noble. Unified Image and Video Saliency Modeling. ECCV 2020. University of Oxford.\nhttps://github.com/rdroste/unisal\n\n${license}`);
if (process.env.GLANCE_MIRROR_MODELS === '1') {
  for (const id of ['sum', 'transalnet']) {
    try { await copyModel(id, '../../docs/app/models'); }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      console.warn(`${id}: Pages mirror pending model release`);
    }
  }
  for (const name of ['SUM-MIT.txt', 'TranSalNet-MIT.txt', 'Mamba-Apache-2.0.txt']) {
    await copyFile(`../../models/licenses/${name}`, `../../docs/app/models/${name}`);
  }
}
const html = await readFile('../../docs/app/index.html', 'utf8');
if (!html.includes('Free AI attention heatmap') || !html.includes('application/ld+json')) throw Error('Missing web SEO');
console.log(`Web build ready; HTML SHA-256 ${createHash('sha256').update(html).digest('hex')}`);
