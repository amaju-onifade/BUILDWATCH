# Skill: Photo Upload Pipeline

**Applies to:** Any task involving photo capture, compression, upload, storage, or the offline submission queue.  
**Read this entire file before writing any photo-related code.**

---

## Overview

The photo upload pipeline is BuildWatch's most operationally complex flow. It runs on the **proxy's mobile device**, often in poor connectivity conditions (construction sites in Nigeria frequently have intermittent data). Every design decision prioritises **offline resilience** over convenience.

The pipeline has five stages:

```
1. Capture / Select
      ↓
2. Client-side Validation
      ↓
3. Client-side Compression  (mandatory — max 400 KB per photo)
      ↓
4. Offline Queue (IndexedDB) ← sync when online
      ↓
5. Upload to R2 via Signed URL
```

**Critical constraint:** Stages 1–4 must work entirely offline. Stage 5 is deferred until connectivity is confirmed. **Never block the proxy from completing a submission because they are offline.**

---

## Stage 1 — Capture / Select

```typescript
// src/modules/submissions/components/PhotoCapture.tsx
'use client'

// Accept camera capture on mobile, file picker on desktop
// Enforce min 1, max 10 photos per submission (from PRD)
const ACCEPT = 'image/jpeg,image/png,image/webp'
const MAX_PHOTOS = 10
const MIN_PHOTOS = 1
```

HTML input pattern for mobile-first camera access:

```html
<!-- Primary: camera capture on mobile -->
<input
  type="file"
  accept="image/jpeg,image/png,image/webp"
  capture="environment"
  multiple
  aria-label="Take photos of the construction site"
/>

<!-- Secondary: gallery / file picker (no capture attribute) -->
<input
  type="file"
  accept="image/jpeg,image/png,image/webp"
  multiple
  aria-label="Choose photos from your device"
/>
```

---

## Stage 2 — Client-side Validation

Validate before compression. Reject early to save processing time.

```typescript
// src/modules/submissions/lib/validatePhoto.ts

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_RAW_SIZE_BYTES = 10 * 1024 * 1024  // 10 MB raw input limit
const MAGIC_BYTES: Record<string, number[][]> = {
  'image/jpeg': [[0xFF, 0xD8, 0xFF]],
  'image/png':  [[0x89, 0x50, 0x4E, 0x47]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]],  // RIFF....WEBP
}

export type PhotoValidationResult =
  | { ok: true }
  | { ok: false; error: string }

export async function validatePhoto(file: File): Promise<PhotoValidationResult> {
  // 1. MIME type check (from browser)
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return { ok: false, error: `Unsupported file type: ${file.type}` }
  }

  // 2. Raw size check
  if (file.size > MAX_RAW_SIZE_BYTES) {
    return { ok: false, error: 'Photo is too large (max 10 MB before compression)' }
  }

  // 3. Magic bytes check — verify actual content, not just extension
  const buffer = await file.slice(0, 12).arrayBuffer()
  const bytes = new Uint8Array(buffer)
  const signatures = MAGIC_BYTES[file.type] ?? []
  const valid = signatures.some(sig =>
    sig.every((byte, i) => bytes[i] === byte)
  )
  if (!valid) {
    return { ok: false, error: 'File content does not match its declared type' }
  }

  return { ok: true }
}
```

---

## Stage 3 — Client-side Compression (Mandatory)

**This step is non-negotiable.** Every photo must be compressed to ≤ 400 KB before it enters the queue or is uploaded. This cannot be disabled, bypassed, or made optional.

```typescript
// src/modules/submissions/lib/compressPhoto.ts

const TARGET_SIZE_BYTES = 400 * 1024   // 400 KB
const MAX_DIMENSION = 1920             // px — preserve aspect ratio
const INITIAL_QUALITY = 0.82
const MIN_QUALITY = 0.45
const QUALITY_STEP = 0.08

export async function compressPhoto(file: File): Promise<Blob> {
  // Draw to canvas at max dimension, then iteratively reduce quality
  const bitmap = await createImageBitmap(file)

  const scale = Math.min(
    MAX_DIMENSION / bitmap.width,
    MAX_DIMENSION / bitmap.height,
    1  // never upscale
  )
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  // Iteratively reduce quality until target size is met
  let quality = INITIAL_QUALITY
  let blob: Blob

  do {
    blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        b => b ? resolve(b) : reject(new Error('Canvas toBlob failed')),
        'image/jpeg',
        quality
      )
    )
    quality = Math.round((quality - QUALITY_STEP) * 100) / 100
  } while (blob.size > TARGET_SIZE_BYTES && quality >= MIN_QUALITY)

  if (blob.size > TARGET_SIZE_BYTES) {
    // Final fallback: reduce dimensions by 50%
    const fallbackCanvas = document.createElement('canvas')
    fallbackCanvas.width = Math.round(width * 0.5)
    fallbackCanvas.height = Math.round(height * 0.5)
    const fCtx = fallbackCanvas.getContext('2d')!
    fCtx.drawImage(canvas, 0, 0, fallbackCanvas.width, fallbackCanvas.height)
    blob = await new Promise<Blob>((resolve, reject) =>
      fallbackCanvas.toBlob(
        b => b ? resolve(b) : reject(new Error('Canvas toBlob failed')),
        'image/jpeg',
        MIN_QUALITY
      )
    )
  }

  return blob
}
```

**Rule:** After compression, verify `blob.size <= TARGET_SIZE_BYTES` before enqueuing. If it still exceeds the limit after all reductions, reject the photo with a user-facing error — do not upload it.

---

## Stage 4 — Offline Queue (IndexedDB)

The queue stores compressed photo blobs and submission metadata. It persists across page reloads and app restarts. Background sync retries every 60 seconds when connectivity is restored.

### IndexedDB Schema

```typescript
// src/modules/submissions/lib/offlineQueue.ts

const DB_NAME = 'buildwatch-queue'
const DB_VERSION = 1
const STORE_NAME = 'pending-submissions'

interface QueuedSubmission {
  id: string              // client-generated cuid
  milestoneId: string
  projectId: string
  caption: string | null
  geoLat: number | null
  geoLng: number | null
  photos: {
    blob: Blob
    filename: string
  }[]
  createdAt: number       // Date.now()
  attempts: number        // retry count
  status: 'pending' | 'uploading' | 'failed'
  lastError: string | null
}
```

### Queue Operations

```typescript
export async function openQueue(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = e => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('status', 'status', { unique: false })
        store.createIndex('createdAt', 'createdAt', { unique: false })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function enqueueSubmission(submission: QueuedSubmission): Promise<void> {
  const db = await openQueue()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(submission)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getPendingSubmissions(): Promise<QueuedSubmission[]> {
  const db = await openQueue()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).index('status').getAll('pending')
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function removeFromQueue(id: string): Promise<void> {
  const db = await openQueue()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function markFailed(id: string, error: string): Promise<void> {
  const db = await openQueue()
  const submission = await getById(db, id)
  if (!submission) return
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put({
      ...submission,
      status: 'failed',
      attempts: submission.attempts + 1,
      lastError: error,
    })
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

async function getById(db: IDBDatabase, id: string): Promise<QueuedSubmission | null> {
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(id)
    req.onsuccess = () => resolve(req.result ?? null)
    req.onerror = () => reject(req.error)
  })
}
```

### Background Sync (Service Worker)

```typescript
// In service worker: src/sw.ts
/// <reference lib="webworker" />
// NOTE: The triple-slash directive above is required — it tells TypeScript to use
// the webworker lib (which defines SyncEvent, ServiceWorkerGlobalScope, etc.)
// instead of the DOM lib from tsconfig. Without it, SyncEvent will not resolve.

const SYNC_TAG = 'submission-sync'
const RETRY_INTERVAL_MS = 60_000

// Register sync when connectivity is restored
self.addEventListener('online', () => {
  self.registration.sync.register(SYNC_TAG).catch(() => {
    // Background Sync API not available — fall back to polling
    setTimeout(() => self.dispatchEvent(new Event('sync-fallback')), RETRY_INTERVAL_MS)
  })
})

self.addEventListener('sync', (event: SyncEvent) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(flushQueue())
  }
})
```

---

## Stage 5 — Upload to R2 via Signed URL

**Never upload directly from the client to R2 using permanent credentials.** Always use short-lived signed URLs issued by your API.

### Step A — Request a Signed Upload URL

```typescript
// Client-side: request a signed URL for each photo
async function getSignedUploadUrl(params: {
  submissionId: string
  filename: string
  contentType: string
  sizeBytes: number
}): Promise<{ uploadUrl: string; storageKey: string }> {
  const res = await fetch('/api/submissions/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!res.ok) throw new Error(`Failed to get upload URL: ${res.status}`)
  return res.json()
}
```

### Step B — Issue the Signed URL (Server-side)

```typescript
// src/modules/submissions/api/uploadUrl.ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

export async function issueUploadUrl(params: {
  submissionId: string
  projectId: string
  filename: string
  contentType: string
  sizeBytes: number
}): Promise<{ uploadUrl: string; storageKey: string }> {
  // Storage key is server-controlled — never user-supplied
  const storageKey = `projects/${params.projectId}/submissions/${params.submissionId}/${crypto.randomUUID()}`

  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: storageKey,
    ContentType: params.contentType,
    ContentLength: params.sizeBytes,
    Metadata: {
      submissionId: params.submissionId,
      projectId: params.projectId,
    },
  })

  const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 300 }) // 5 min

  return { uploadUrl, storageKey }
}
```

### Step C — Upload the Blob

```typescript
// Client: PUT directly to the signed URL
async function uploadToR2(blob: Blob, signedUrl: string): Promise<void> {
  const res = await fetch(signedUrl, {
    method: 'PUT',
    body: blob,
    headers: { 'Content-Type': 'image/jpeg' },
  })
  if (!res.ok) throw new Error(`R2 upload failed: ${res.status}`)
}
```

### Step D — Confirm Upload (Server-side record)

After all photos are uploaded, POST to `/api/submissions` with the array of `storageKey` values. The server records the submission, links the photo keys, and triggers the AI analysis job.

```typescript
// Final step — confirm submission server-side
await fetch('/api/submissions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    milestoneId,
    caption,
    geoLat,
    geoLng,
    photoKeys: storageKeys,  // R2 keys, never client-supplied paths
  }),
})
```

---

## Serving Photos (Owner View)

Photos are **never served from a public URL**. The owner requests a signed read URL through the API.

```typescript
// src/modules/submissions/lib/getPhotoUrl.ts
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export async function getSignedReadUrl(
  storageKey: string,
  expiresInSeconds = 3600  // 1 hour
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: storageKey,
  })
  return getSignedUrl(r2, command, { expiresIn: expiresInSeconds })
}
```

---

## GPS Geotag Capture

GPS coordinates are captured client-side using the Geolocation API and stored server-side only.

```typescript
// src/modules/submissions/lib/captureGeoTag.ts
'use client'

export type GeoTagResult =
  | { ok: true; lat: number; lng: number; accuracy: number }
  | { ok: false; error: string }

export async function captureGeoTag(
  timeoutMs = 10_000
): Promise<GeoTagResult> {
  if (!navigator.geolocation) {
    return { ok: false, error: 'Geolocation not supported on this device' }
  }

  return new Promise(resolve => {
    const timer = setTimeout(
      () => resolve({ ok: false, error: 'Location timed out' }),
      timeoutMs
    )

    navigator.geolocation.getCurrentPosition(
      pos => {
        clearTimeout(timer)
        resolve({
          ok: true,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        })
      },
      err => {
        clearTimeout(timer)
        resolve({ ok: false, error: err.message })
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 }
    )
  })
}
```

**Rules:**
- GPS capture is best-effort. A failed geolocation must never block a submission.
- Accuracy values above 100m should display a soft warning to the proxy ("Location may be imprecise").
- Coordinates are sent to the server once and never returned to the proxy in any response.
- Never log coordinates in client-side console output.

---

## Offline UI Requirements

The proxy submission UI must always show connectivity and queue state:

| State | UI indicator |
|-------|-------------|
| Online, queue empty | No indicator (clean) |
| Online, flushing queue | "Sending X saved submissions…" banner |
| Offline, submission captured | "Saved. Will send when you're back online." toast |
| Offline, submission failed | "Couldn't send. Saved for later." toast |
| Queue item failed after 3 retries | "Submission needs attention" persistent alert |

The offline indicator lives in the sticky header of the proxy interface (see `design-system.md` field mode rules).

---

## Security Checklist

Before marking any photo pipeline task complete:

- [ ] Client-side MIME type AND magic bytes validation both present
- [ ] Compression enforced — no upload path bypasses it
- [ ] `blob.size <= 400 * 1024` asserted before enqueue
- [ ] Storage key is server-generated — never constructed from user input
- [ ] Signed upload URL expires in ≤ 5 minutes
- [ ] Signed read URL expires in ≤ 1 hour
- [ ] R2 bucket has no public access policy
- [ ] GPS coordinates are never returned in any API response to the proxy
- [ ] GPS coordinates are never logged client-side
- [ ] Queue items are removed from IndexedDB after confirmed server receipt
