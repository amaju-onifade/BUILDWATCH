'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { nanoid } from 'nanoid'
import { compressImage } from '../../lib/compression'
import { offlineQueue } from '../../lib/offlineQueue'
import styles from './PhotoUploader.module.css'

type Props = {
  projectId: string
  milestoneId: string
  onComplete?: () => void
}

type PhotoState = {
  id: string
  blob: Blob
  preview: string
  uploadStatus: 'pending' | 'uploading' | 'done' | 'failed'
}

function now(): number {
  return Date.now()
}

async function uploadPhoto(blob: Blob, projectId: string, submissionId: string): Promise<string> {
  const res = await fetch(
    `/api/submissions/upload-url?projectId=${encodeURIComponent(projectId)}&submissionId=${encodeURIComponent(submissionId)}`
  )
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || 'Failed to get upload URL')
  }
  const { data } = await res.json()

  const uploadRes = await fetch(data.url, {
    method: 'PUT',
    body: blob,
    headers: { 'Content-Type': 'image/jpeg' },
  })
  if (!uploadRes.ok) throw new Error('Failed to upload image to storage')

  return data.key
}

export function PhotoUploader({ projectId, milestoneId, onComplete }: Props) {
  const [photos, setPhotos] = useState<PhotoState[]>([])
  const [caption, setCaption] = useState('')
  const [isCompressing, setIsCompressing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    if (selectedFiles.length === 0) return

    setIsCompressing(true)
    setError(null)

    try {
      const newPhotos = await Promise.all(
        selectedFiles.slice(0, 10 - photos.length).map(async (file) => {
          const compressed = await compressImage(file)
          return {
            id: nanoid(),
            blob: compressed,
            preview: URL.createObjectURL(compressed),
            uploadStatus: 'pending' as const,
          }
        })
      )
      setPhotos((prev) => [...prev, ...newPhotos])
    } catch (err) {
      console.error('[uploader] Compression failed:', err)
      setError('Failed to process one or more images.')
    } finally {
      setIsCompressing(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const removePhoto = (id: string) => {
    setPhotos((prev) => {
      const photo = prev.find((p) => p.id === id)
      if (photo) URL.revokeObjectURL(photo.preview)
      return prev.filter((p) => p.id !== id)
    })
  }

  const handleSubmit = async () => {
    if (photos.length === 0) return
    setIsSubmitting(true)
    setError(null)

    try {
      // Get GPS if possible (best effort as per PRD)
      let geoLat: number | undefined
      let geoLng: number | undefined

      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) => {
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 })
        })
        geoLat = pos.coords.latitude
        geoLng = pos.coords.longitude
      } catch {
        console.warn('[uploader] GPS capture failed — submitting without coordinates')
      }

      // Check connectivity
      if (!navigator.onLine) {
        await offlineQueue.add({
          id: nanoid(),
          projectId,
          milestoneId,
          photos: photos.map(p => p.blob),
          caption: caption || undefined,
          geoLat,
          geoLng,
          timestamp: now(),
        })
        alert('You are offline. Your submission has been saved and will upload automatically when you reconnect.')
        reset()
        return
      }

      // Upload each photo to R2 via signed URL
      const submissionId = nanoid(12)
      const storageKeys: string[] = []

      for (const photo of photos) {
        setPhotos((prev) =>
          prev.map((p) => (p.id === photo.id ? { ...p, uploadStatus: 'uploading' as const } : p))
        )

        try {
          const key = await uploadPhoto(photo.blob, projectId, submissionId)
          storageKeys.push(key)
          setPhotos((prev) =>
            prev.map((p) => (p.id === photo.id ? { ...p, uploadStatus: 'done' as const } : p))
          )
        } catch (err) {
          console.error('[uploader] Photo upload failed:', err)
          setPhotos((prev) =>
            prev.map((p) => (p.id === photo.id ? { ...p, uploadStatus: 'failed' as const } : p))
          )
          throw new Error(`Failed to upload photo ${storageKeys.length + 1}`)
        }
      }

      // Create the submission record
      const createRes = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          milestoneId,
          projectId,
          photos: storageKeys,
          caption: caption || undefined,
          geoLat,
          geoLng,
        }),
      })

      if (!createRes.ok) {
        const body = await createRes.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to create submission')
      }

      reset()
      onComplete?.()
    } catch (err) {
      console.error('[uploader] Submission failed:', err)
      setError(err instanceof Error ? err.message : 'Failed to submit. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const reset = useCallback(() => {
    photos.forEach((p) => URL.revokeObjectURL(p.preview))
    setPhotos([])
    setCaption('')
  }, [photos])

  // Cleanup previews on unmount
  useEffect(() => {
    return () => {
      photos.forEach((p) => URL.revokeObjectURL(p.preview))
    }
  }, [photos])

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Submit Photos</h3>
        <p className={styles.subtitle}>Upload up to 10 photos of current progress</p>
      </div>

      <div className={styles.photoGrid}>
        {photos.map((photo) => (
          <div key={photo.id} className={styles.photoCard} data-status={photo.uploadStatus}>
            <img src={photo.preview} alt="Preview" className={styles.preview} />
            {photo.uploadStatus === 'uploading' && (
              <div className={styles.uploadOverlay}>
                <span className={styles.spinner} />
              </div>
            )}
            {photo.uploadStatus === 'failed' && (
              <div className={styles.uploadOverlay}>
                <span className={styles.failedIcon}>!</span>
              </div>
            )}
            {photo.uploadStatus === 'done' && (
              <div className={styles.uploadOverlay}>
                <span className={styles.doneIcon}>✓</span>
              </div>
            )}
            <button
              onClick={() => removePhoto(photo.id)}
              className={styles.removeBtn}
              aria-label="Remove photo"
              disabled={isSubmitting || photo.uploadStatus === 'uploading'}
            >
              ×
            </button>
          </div>
        ))}

        {photos.length < 10 && (
          <button
            className={styles.addBtn}
            onClick={() => fileInputRef.current?.click()}
            disabled={isCompressing || isSubmitting}
          >
            {isCompressing ? (
              <span className={styles.spinner} />
            ) : (
              <>
                <span className={styles.plus}>+</span>
                <span className={styles.addLabel}>Add Photo</span>
              </>
            )}
          </button>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        multiple
        hidden
      />

      <textarea
        className={styles.captionInput}
        placeholder="Add notes about this progress update (optional)"
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        maxLength={500}
        rows={2}
        disabled={isSubmitting}
      />

      {error && <div className={styles.error} role="alert">{error}</div>}

      <div className={styles.actions}>
        <button
          className={styles.submitBtn}
          onClick={handleSubmit}
          disabled={photos.length === 0 || isSubmitting || isCompressing}
        >
          {isSubmitting ? 'Uploading...' : 'Submit Progress'}
        </button>
      </div>
    </div>
  )
}
