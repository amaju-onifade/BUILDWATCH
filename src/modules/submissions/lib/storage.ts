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
): Promise<{ url: string; key: string }> {
  const key = `projects/${projectId}/submissions/${submissionId}/${filename}`
  
  const command = new PutObjectCommand({
    Bucket: config.r2BucketName,
    Key: key,
    ContentType: 'image/jpeg',
  })

  // Signed URL expires in 1 hour
  const url = await getSignedUrl(s3, command, { expiresIn: 3600 })

  return { url, key }
}
