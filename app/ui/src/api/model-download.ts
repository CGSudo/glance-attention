export interface DownloadModel { id: string; sha256: string; size_bytes: number }

export async function verifyModel(bytes: Uint8Array, model: DownloadModel): Promise<void> {
  if (bytes.length !== model.size_bytes) throw new Error(`${model.id}: model size mismatch; model rejected`);
  const input = bytes.buffer instanceof ArrayBuffer && bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength
    ? bytes.buffer : new Uint8Array(bytes).buffer;
  const digest = await crypto.subtle.digest('SHA-256', input);
  const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  if (hash !== model.sha256) throw new Error(`${model.id}: SHA-256 mismatch; model rejected`);
}

export async function downloadModel(urls: string[], model: DownloadModel, progress: (downloaded: number) => void): Promise<Uint8Array> {
  let response: Response | undefined;
  let missing = false;
  for (const url of urls) {
    try {
      const candidate = await fetch(url, { signal: AbortSignal.timeout(600_000) });
      if (candidate.status === 404) missing = true;
      if (candidate.ok) { response = candidate; break; }
    } catch { /* GitHub Releases may reject CORS; try the Pages mirror. */ }
  }
  if (!response?.body) throw new Error(missing
    ? `${model.id}: model not published yet. Try the desktop app or retry after publication.`
    : `${model.id}: download failed. Check your connection, then retry.`);
  const reader = response.body.getReader();
  const bytes = new Uint8Array(model.size_bytes);
  let offset = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (offset + value.length > bytes.length) throw new Error(`${model.id}: download exceeds registry size`);
      bytes.set(value, offset);
      offset += value.length;
      progress(offset);
    }
  } finally { await reader.cancel(); }
  if (offset !== bytes.length) throw new Error(`${model.id}: incomplete download; retry`);
  await verifyModel(bytes, model);
  return bytes;
}
