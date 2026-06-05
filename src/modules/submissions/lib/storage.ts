import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { config } from '@/lib/config'

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${config.r2AccountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: config.r2AccessKeyId,
    secretAccessKey: config.r2SecretAccessKey,
  },
})

/**
 * Generates a signed PUT URL for uploading a photo to R2.
 * The path is structured as: projects/{projectId}/submissions/{submissionId}/{filename}
 */
export async function getUploadUrl(
  projectId: string,
  submissionId: string,
  filename: string
): Promise<{ url: string; key: string; isMock?: boolean }> {
  const key = `projects/${projectId}/submissions/${submissionId}/${filename}`
  
  // Dev Fallback: If credentials are placeholders, return a mock URL
  if (config.r2AccountId.startsWith('dev-')) {
    return {
      url: `${config.appUrl}/api/submissions/mock-upload?key=${encodeURIComponent(key)}`,
      key,
      isMock: true
    }
  }

  const command = new PutObjectCommand({
    Bucket: config.r2BucketName,
    Key: key,
    ContentType: 'image/jpeg',
  })

  // Signed URL expires in 1 hour
  const url = await getSignedUrl(s3, command, { expiresIn: 3600 })

  return { url, key }
}

/**
 * Generates a signed GET URL for viewing a photo.
 * Falls back to a beautiful placeholder image in development.
 */
export async function getDownloadUrl(key: string): Promise<string> {
  if (config.r2AccountId.startsWith('dev-')) {
    // Return a stable placeholder for development
    return `https://placehold.co/800x600/0f6d4e/ffffff?text=Construction+Photo`
  }

  const { GetObjectCommand } = await import('@aws-sdk/client-s3')
  const command = new GetObjectCommand({
    Bucket: config.r2BucketName,
    Key: key,
  })

  // Signed URL expires in 1 hour
  return getSignedUrl(s3, command, { expiresIn: 3600 })
}
