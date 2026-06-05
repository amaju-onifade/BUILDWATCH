import crypto from 'crypto'
import { config as appConfig } from '@/lib/config'

export function verifyFlutterwaveSignature(
  rawBody: string,
  signature: string | null,
): boolean {
  if (!signature) return false
  const secretHash = appConfig.flwSecretHash
  
  const hash = crypto
    .createHmac('sha256', secretHash)
    .update(rawBody)
    .digest('base64')
    
  // Use timingSafeEqual to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(hash),
      Buffer.from(signature)
    )
  } catch {
    return false
  }
}
