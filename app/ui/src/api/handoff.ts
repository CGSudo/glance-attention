/**
 * Handoff API for browser extension integration.
 * Only inside extension context (`chrome?.storage?.session`), reads key `glance:capture`
 * (PNG data URL), converts to a File object, then removes the key.
 */

interface ChromeStorageArea {
  get(keys: string[] | Record<string, unknown>, callback: (items: Record<string, unknown>) => void): void;
  remove(keys: string | string[], callback?: () => void): void;
}

interface ChromeLike {
  storage?: {
    session?: ChromeStorageArea;
  };
}

export async function loadImageFromHandoff(): Promise<File | null> {
  try {
    const chromeApi = (globalThis as unknown as { chrome?: ChromeLike }).chrome;
    const session = chromeApi?.storage?.session;
    if (!session || typeof session.get !== 'function' || typeof session.remove !== 'function') {
      return null;
    }

    const items = await new Promise<Record<string, unknown>>((resolve) => {
      session.get(['glance:capture'], (res) => resolve(res || {}));
    });

    const dataUrl = items['glance:capture'];
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
      return null;
    }

    // Remove key immediately after reading
    await new Promise<void>((resolve) => {
      session.remove('glance:capture', () => resolve());
    });

    // Convert data URL to File with real MIME type and matching extension
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const mime = blob.type || 'image/png';
    const ext = mime.includes('webp') ? 'webp' : mime.includes('jpeg') || mime.includes('jpg') ? 'jpg' : 'png';
    return new File([blob], `extension-capture.${ext}`, { type: mime });
  } catch (err) {
    console.warn('Failed to load image from handoff:', err);
    return null;
  }
}
