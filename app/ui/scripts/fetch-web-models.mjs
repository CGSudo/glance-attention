import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const registry = JSON.parse(await readFile('../../models/registry.json', 'utf8'));
for (const model of registry.filter(model => ['unisal', 'sum', 'transalnet'].includes(model.id))) {
  let bytes = await readFile(`../../models/${model.id}.onnx`).catch(() => undefined);
  if (!bytes && model.id === 'unisal') bytes = await readFile('../../docs/app/models/unisal.onnx').catch(() => undefined);
  if (!bytes) {
    const response = await fetch(model.url, { signal: AbortSignal.timeout(600_000) });
    if (!response.ok) throw Error(`${model.id}: HTTP ${response.status}`);
    bytes = new Uint8Array(await response.arrayBuffer());
  }
  if (bytes.length !== model.size_bytes || createHash('sha256').update(bytes).digest('hex') !== model.sha256) throw Error(`${model.id}: SHA-256 mismatch`);
  await writeFile(`../../models/${model.id}.onnx`, bytes);
  console.log(`${model.id}: verified ${bytes.length} bytes`);
}
