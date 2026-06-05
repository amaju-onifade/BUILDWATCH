/* BuildWatch Service Worker — Background Sync & Static Asset Caching */

const CACHE_NAME = 'buildwatch-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

const DB_NAME = 'buildwatch-offline';
const STORE_NAME = 'submissions';
const DB_VERSION = 1;
const SYNC_QUEUE_TAG = 'submission-sync';
const SYNC_INTERVAL_MS = 60000;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).then((networkResponse) => {
        if (url.origin === self.location.origin && url.pathname.startsWith('/_next/static')) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      });
    })
  );
});

/* Background Sync */
self.addEventListener('sync', (event) => {
  if (event.tag === SYNC_QUEUE_TAG) {
    event.waitUntil(processOfflineQueue());
  }
});

setInterval(() => {
  processOfflineQueue();
}, SYNC_INTERVAL_MS);

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function processOfflineQueue() {
  console.log('[sw] Processing offline queue...');

  let db;
  try {
    db = await openDB();
  } catch (err) {
    console.error('[sw] Failed to open IndexedDB:', err);
    return;
  }

  const transaction = db.transaction(STORE_NAME, 'readonly');
  const store = transaction.objectStore(STORE_NAME);
  const items = await new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  if (!items || items.length === 0) {
    console.log('[sw] No queued submissions to sync.');
    return;
  }

  for (const item of items) {
    try {
      const submissionId = item.id;
      const storageKeys = [];

      for (let i = 0; i < item.photos.length; i++) {
        const blob = item.photos[i];
        const photoId = `${submissionId}-${i}`;

        const urlRes = await fetch(
          `/api/submissions/upload-url?projectId=${encodeURIComponent(item.projectId)}&submissionId=${encodeURIComponent(photoId)}`,
          { credentials: 'include' }
        );
        if (!urlRes.ok) throw new Error('Failed to get upload URL');
        const { data } = await urlRes.json();

        const uploadRes = await fetch(data.url, {
          method: 'PUT',
          body: blob,
          headers: { 'Content-Type': 'image/jpeg' },
        });
        if (!uploadRes.ok) throw new Error('Failed to upload photo to storage');

        storageKeys.push(data.key);
      }

      const createRes = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          milestoneId: item.milestoneId,
          projectId: item.projectId,
          photos: storageKeys,
          caption: item.caption || undefined,
          geoLat: item.geoLat,
          geoLng: item.geoLng,
        }),
        credentials: 'include',
      });
      if (!createRes.ok) throw new Error('Failed to create submission');

      // Remove from queue on success
      const deleteTx = db.transaction(STORE_NAME, 'readwrite');
      const deleteStore = deleteTx.objectStore(STORE_NAME);
      await new Promise((resolve, reject) => {
        const req = deleteStore.delete(item.id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });

      console.log('[sw] Successfully synced submission:', item.id);
    } catch (err) {
      console.error('[sw] Failed to sync submission:', item.id, err);
    }
  }

  db.close();
}
