import crypto from 'crypto'
import { config } from './config'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12

/**
 * Encrypts a string using AES-256-GCM.
 * Used for sensitive data like GPS coordinates.
 */
export function encrypt(text: string): string {
  // Use JWT_SECRET as the base for the key
  // Must be 32 bytes for AES-256
  const key = crypto.scryptSync(config.jwtSecret, 'salt', 32)
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag().toString('hex')

  // Return IV + AuthTag + EncryptedText
  return `${iv.toString('hex')}:${authTag}:${encrypted}`
}

/**
 * Decrypts a string using AES-256-GCM.
 */
export function decrypt(encryptedData: string): string {
  const [ivHex, authTagHex, encryptedTextHex] = encryptedData.split(':')
  
  if (!ivHex || !authTagHex || !encryptedTextHex) {
    throw new Error('Invalid encrypted data format')
  }

  const key = crypto.scryptSync(config.jwtSecret, 'salt', 32)
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)

  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encryptedTextHex, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}
