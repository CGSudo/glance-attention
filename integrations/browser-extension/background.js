import { fitCapture } from './capture-size.js';
import noticeUrl from './capture-notice.html?url';

const api = globalThis.browser || globalThis.chrome;
let capturing = false;

// Isolated extension world keeps capture state inaccessible to page scripts.
function pageCapture(operation, y = 0) {
  const key = '__glanceCapture';
  if (operation === 'restore') {
    const state = globalThis[key];
    if (!state) return;
    for (const [element, value, priority] of state.hidden) {
      if (value) element.style.setProperty('visibility', value, priority);
      else element.style.removeProperty('visibility');
    }
    window.scrollTo({ left: state.x, top: state.y, behavior: 'instant' });
    state.style.remove();
    delete globalThis[key];
    return;
  }
  if (operation === 'prepare') {
    const style = document.createElement('style');
    style.textContent = '* { scroll-behavior: auto !important; scroll-snap-type: none !important; overflow-anchor: none !important; }';
    globalThis[key] = { x: scrollX, y: scrollY, style, hidden: [] };
    document.documentElement.append(style);
  } else if (y > 0) {
    for (const element of document.querySelectorAll('*')) {
      const position = getComputedStyle(element).position;
      if ((position === 'fixed' || position === 'sticky') &&
          !globalThis[key].hidden.some(([saved]) => saved === element)) {
        globalThis[key].hidden.push([element, element.style.getPropertyValue('visibility'), element.style.getPropertyPriority('visibility')]);
        element.style.setProperty('visibility', 'hidden', 'important');
      }
    }
  }
  window.scrollTo({ left: 0, top: y, behavior: 'instant' });
  return { y: scrollY, width: innerWidth, height: innerHeight,
    pageHeight: Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight || 0) };
}

api.action.onClicked.addListener(async (tab) => {
  if (capturing) return;
  capturing = true;
  const status = async (text, title) => {
    await api.action.setBadgeText({ text });
    await api.action.setTitle({ title });
  };
  const run = async (operation, y) => {
    const [frame] = await api.scripting.executeScript({ target: { tabId: tab.id }, func: pageCapture, args: [operation, y || 0] });
    if (frame.error) throw new Error('Page access failed.');
    return frame.result;
  };
  try {
    await status('…', 'Capturing page. Keep this tab active.');
    const viewport = await run('prepare');
    let canvas, context, scale, height, capped;
    let next = 0;
    while (!canvas || next < height) {
      const frame = await run('scroll', next);
      // Chrome permits two captures per second; also allow layout to settle.
      await new Promise(resolve => setTimeout(resolve, 600));
      const [active] = await api.tabs.query({ active: true, windowId: tab.windowId });
      if (active?.id !== tab.id) throw new Error('Tab changed. Return to the page and retry.');
      const data = await api.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
      const [stillActive] = await api.tabs.query({ active: true, windowId: tab.windowId });
      if (stillActive?.id !== tab.id) throw new Error('Tab changed. Return to the page and retry.');
      const bitmap = await createImageBitmap(await (await fetch(data)).blob());
      try {
        if (!canvas) {
          scale = bitmap.height / viewport.height;
          height = Math.min(viewport.pageHeight, 20000 / scale);
          capped = viewport.pageHeight > height;
          canvas = new OffscreenCanvas(bitmap.width, Math.min(20000, Math.ceil(height * scale)));
          context = canvas.getContext('2d');
          if (!context) throw new Error('Canvas unavailable.');
        }
        if (frame.width !== viewport.width || frame.height !== viewport.height ||
            bitmap.width !== canvas.width || bitmap.height !== Math.round(viewport.height * scale)) {
          throw new Error('Page size changed. Retry capture.');
        }
        const sourceY = Math.round((next - frame.y) * scale);
        const destinationY = Math.round(next * scale);
        const rows = Math.min(bitmap.height - sourceY, canvas.height - destinationY);
        if (sourceY < 0 || rows <= 0) throw new Error('Page stopped scrolling. Retry capture.');
        context.drawImage(bitmap, 0, sourceY, bitmap.width, rows, 0, destinationY, bitmap.width, rows);
        next = (destinationY + rows) / scale;
        await status(`${Math.min(100, Math.round(next / height * 100))}%`,
          capped ? 'Capturing top 20000 image pixels only.' : 'Capturing full page. Keep this tab active.');
      } finally {
        bitmap.close();
      }
    }
    await run('restore');
    let blob;
    const fitted = await fitCapture(canvas.width, canvas.height, async (width, height) => {
      const output = new OffscreenCanvas(width, height);
      const outputContext = output.getContext('2d');
      if (!outputContext) throw new Error('Canvas unavailable.');
      const sourceHeight = Math.min(canvas.height, height * canvas.width / width);
      outputContext.drawImage(canvas, 0, 0, canvas.width, sourceHeight, 0, 0, width, height);
      try {
        blob = await output.convertToBlob({ type: 'image/webp', quality: 0.85 });
      } catch {
        blob = null;
      }
      if (blob?.type !== 'image/webp') {
        blob = await output.convertToBlob({ type: 'image/jpeg', quality: 0.85 });
      }
      return `data:${blob.type};base64,`.length + 4 * Math.ceil(blob.size / 3);
    });
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = '';
    for (let start = 0; start < bytes.length; start += 32768) {
      binary += String.fromCharCode(...bytes.subarray(start, start + 32768));
    }
    try {
      await api.storage.session.set({ 'glance:capture': `data:${blob.type};base64,${btoa(binary)}` });
    } catch {
      await api.windows.create({ url: api.runtime.getURL(`${noticeUrl}#storage-error`), type: 'popup', width: 420, height: 280 });
      throw new Error('Capture could not be saved. Session storage is full or unavailable. Try a smaller page.');
    }
    await api.tabs.create({ url: api.runtime.getURL('index.html') });
    if (fitted.cropped) {
      await api.windows.create({ url: api.runtime.getURL(`${noticeUrl}#cropped`), type: 'popup', width: 420, height: 280 });
    }
    await status(fitted.cropped ? 'Top' : capped ? '20k' : '', fitted.cropped
      ? 'Captured top part only to fit session storage.'
      : capped
      ? 'Captured top 20000 image pixels only. Analyse this full page to retry.'
      : 'Analyse this full page');
  } catch (error) {
    await status('!', `Capture failed: ${error.message} Open a normal web page and retry.`);
  } finally {
    try { await run('restore'); } catch { /* Navigation can remove the original document. */ }
    capturing = false;
  }
});
