import { copyFile, mkdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

export async function copyRuntime(destination) {
  await mkdir(`${destination}/ort`, { recursive: true });
  await copyFile('../../models/licenses/ONNXRuntime-MIT.txt', `${destination}/ort/LICENSE`);
  await copyFile('../../LICENSE', `${destination}/LICENSE`);
  for (const suffix of ['mjs', 'wasm']) {
    const name = `ort-wasm-simd-threaded.jsep.${suffix}`;
    await copyFile(`node_modules/onnxruntime-web/dist/${name}`, `${destination}/ort/${name}`);
  }
}

export async function copyModel(id, destination) {
  const registry = JSON.parse(await readFile('../../models/registry.json', 'utf8'));
  const model = registry.find(model => model.id === id);
  const bytes = await readFile(`../../models/${id}.onnx`);
  if (createHash('sha256').update(bytes).digest('hex') !== model.sha256) throw Error(`${id}: SHA-256 mismatch`);
  await mkdir(destination, { recursive: true });
  await copyFile(`../../models/${id}.onnx`, `${destination}/${id}.onnx`);
}
