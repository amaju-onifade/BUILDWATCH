/**
 * Compresses an image to stay under a specific file size (default 400KB).
 * Uses a canvas-based approach for client-side compression.
 */
export async function compressImage(
  file: File,
  maxSizeKB: number = 400,
  maxWidth: number = 1920
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target?.result as string
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        // Maintain aspect ratio while limiting width
        if (width > maxWidth) {
          height = (maxWidth / width) * height
          width = maxWidth
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Failed to get canvas context'))
          return
        }

        ctx.drawImage(img, 0, 0, width, height)

        // Iterative quality reduction to hit target size
        let quality = 0.8
        const step = 0.1

        const attemptCompression = () => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Compression failed'))
                return
              }

              if (blob.size / 1024 <= maxSizeKB || quality <= 0.1) {
                resolve(blob)
              } else {
                quality -= step
                attemptCompression()
              }
            },
            'image/jpeg',
            quality
          )
        }

        attemptCompression()
      }
      img.onerror = reject
    }
    reader.onerror = reject
  })
}
