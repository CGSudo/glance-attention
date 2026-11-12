export interface StoredRecentImage {
  id: string;
  name: string;
  timestamp: number;
  thumbnail: string;
  blob: Blob;
}

const DB_NAME = 'glance-recent-uploads';
const STORE_NAME = 'recent-images';
const DB_VERSION = 1;
const MAX_RECENTS = 12;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Creates a compact thumbnail data URL (~120px max) from an image blob.
 */
export async function createThumbnail(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      const url = URL.createObjectURL(blob);
      img.onload = () => {
        try {
          const maxDim = 120;
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, width);
          canvas.height = Math.max(1, height);
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const thumb = canvas.toDataURL('image/jpeg', 0.8);
            URL.revokeObjectURL(url);
            resolve(thumb);
            return;
          }
        } catch {
          // fallback
        }
        URL.revokeObjectURL(url);
        resolve('');
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve('');
      };
      img.src = url;
    } catch {
      resolve('');
    }
  });
}

/**
 * Loads recent images from IndexedDB, newest first, max 12.
 */
export async function getStoredRecentImages(): Promise<StoredRecentImage[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => {
        const items = (request.result as StoredRecentImage[]) || [];
        items.sort((a, b) => b.timestamp - a.timestamp);
        resolve(items.slice(0, MAX_RECENTS));
      };
      request.onerror = () => resolve([]);
      tx.oncomplete = () => db.close();
      tx.onerror = () => {
        db.close();
        resolve([]);
      };
    });
  } catch (err) {
    console.warn('Recent images storage unavailable:', err);
    return [];
  }
}

/**
 * Stores a newly uploaded image in IndexedDB (newest first, max 12).
 */
export async function saveRecentImage(
  file: File | Blob,
  name?: string,
  providedThumbnail?: string
): Promise<StoredRecentImage | null> {
  try {
    const fileName = name || (file instanceof File ? file.name : `image-${Date.now()}.png`);
    const thumbnail = providedThumbnail || (await createThumbnail(file));
    const newItem: StoredRecentImage = {
      id: `recent-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: fileName,
      timestamp: Date.now(),
      thumbnail,
      blob: file,
    };

    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(newItem);

      // Enforce max 12 items limit
      const getAllReq = store.getAll();
      getAllReq.onsuccess = () => {
        const all = (getAllReq.result as StoredRecentImage[]) || [];
        if (all.length > MAX_RECENTS) {
          all.sort((a, b) => a.timestamp - b.timestamp); // oldest first
          const excess = all.length - MAX_RECENTS;
          for (let i = 0; i < excess; i++) {
            store.delete(all[i].id);
          }
        }
      };

      tx.oncomplete = () => {
        db.close();
        resolve(newItem);
      };
      tx.onerror = () => {
        db.close();
        resolve(null);
      };
    });
  } catch (err) {
    console.warn('Failed to save recent image:', err);
    return null;
  }
}

/**
 * Deletes a single recent image by ID.
 */
export async function deleteRecentImage(id: string): Promise<boolean> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(id);
      tx.oncomplete = () => {
        db.close();
        resolve(true);
      };
      tx.onerror = () => {
        db.close();
        resolve(false);
      };
    });
  } catch (err) {
    console.warn('Failed to delete recent image:', err);
    return false;
  }
}

/**
 * Clears all recent images from IndexedDB.
 */
export async function clearAllRecentImages(): Promise<boolean> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.clear();
      tx.oncomplete = () => {
        db.close();
        resolve(true);
      };
      tx.onerror = () => {
        db.close();
        resolve(false);
      };
    });
  } catch (err) {
    console.warn('Failed to clear recent images:', err);
    return false;
  }
}
