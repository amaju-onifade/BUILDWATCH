'use client'

import React, { useState, useRef, useEffect } from 'react'
import { nanoid } from 'nanoid'
import { compressImage } from '../../lib/compression'
import { offlineQueue } from '../../lib/offlineQueue'
import styles from './PhotoUploader.module.css'

type Props = {
  projectId: string
  milestoneId: string
  onComplete?: () => void
}

export function PhotoUploader({ projectId, milestoneId, onComplete }: Props) {
  const [photos, setPhotos] = useState<{ id: string; blob: Blob; preview: string }[]>([])
  const [isCompresing, setIsCompressing] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
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
    setIsUploading(true)
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
        // Queue offline
        await offlineQueue.add({
          id: nanoid(),
          projectId,
          milestoneId,
          photos: photos.map(p => p.blob),
          geoLat,
          geoLng,
          timestamp: Date.now(),
        })
        alert('You are offline. Your submission has been saved and will upload automatically when you reconnect.')
        setPhotos([])
        onComplete?.()
        return
      }

      // Online submission flow (Simplified for now - will need API routes)
      // For now, we'll simulate success and alert about background sync being the way
      // TODO: Implement /api/submissions and actual R2 upload
      
      // TEMPORARY: Store to offline queue even if online for background sync to handle
      // This ensures background sync is the single source of thrush for upload logic
      await offlineQueue.add({
        id: nanoid(),
        projectId,
        milestoneId,
        photos: photos.map(p => p.blob),
        geoLat,
        geoLng,
        timestamp: Date.now(),
      })
      
      setPhotos([])
      onComplete?.()
      
    } catch (err) {
      console.error('[uploader] Submission failed:', err)
      setError('Failed to submit. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  // Cleanup previews
  useEffect(() => {
    return () => {
      photos.forEach(p => URL.revokeObjectURL(p.preview))
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
          <div key={photo.id} className={styles.photoCard}>
            <img src={photo.preview} alt="Preview" className={styles.preview} />
            <button
              onClick={() => removePhoto(photo.id)}
              className={styles.removeBtn}
              aria-label="Remove photo"
            >
              ×
            </button>
          </div>
        ))}

        {photos.length < 10 && (
          <button
            className={styles.addBtn}
            onClick={() => fileInputRef.current?.click()}
            disabled={isCompresing || isUploading}
          >
            {isCompresing ? (
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

      {error && <div className={styles.error} role="alert">{error}</div>}

      <div className={styles.actions}>
        <button
          className={styles.submitBtn}
          onClick={handleSubmit}
          disabled={photos.length === 0 || isUploading || isCompresing}
        >
          {isUploading ? 'Submitting...' : 'Submit Progress'}
        </button>
      </div>
    </div>
  )
}
