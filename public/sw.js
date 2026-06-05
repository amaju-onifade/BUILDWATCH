/* BuildWatch Service Worker — Background Sync & Static Asset Caching */

const CACHE_NAME = 'buildwatch-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Offline sync queue name
const SYNC_QUEUE_TAG = 'submission-sync';

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

/**
 * Handle fetch requests.
 * Strategy: Cache First for static assets, Network First for others.
 */
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Skip browser extensions and non-get requests
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).then((networkResponse) => {
        // Cache new static assets (if they are within our scope)
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

/**
 * Background Sync Implementation.
 */
self.addEventListener('sync', (event) => {
  if (event.tag === SYNC_QUEUE_TAG) {
    event.waitUntil(processOfflineQueue());
  }
});

/**
 * Periodically try to process queue even without sync event 
 * (as a fallback for browsers that don't support Background Sync API properly).
 */
setInterval(() => {
  processOfflineQueue();
}, 60000); // 60 seconds

async function processOfflineQueue() {
  // We can't use modules here directly, need to use self-contained IDB logic or importScripts
  // For simplicity in this demo, we'll assume the IndexedDB logic is available
  // In a real-world scenario, we'd bundle the SW using a tool like workbox-build.
  
  // NOTE: This logic is intended for the production PWA.
  console.log('[sw] Attempting to process offline queue...');
  
  // This is a placeholder for the actual sync logic which will:
  // 1. Open the 'buildwatch-offline' IndexedDB
  // 2. Iterate over 'submissions' store
  // 3. For each submission:
  //    a. Get signed URL from /api/photos/sign
  //    b. Upload Blobs to R2
  //    c. POST metadata to /api/submissions
  //    d. Delete from store on success
}
