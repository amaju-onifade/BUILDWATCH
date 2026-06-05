import crypto from 'crypto'
import { config } from '@/lib/config'

/**
 * Generates a cryptographic signature for an audit event.
 * Uses a combination of the event data and a secret salt.
 * For true chain-verification, ideally this would include the previous event's hash.
 */
export function signAuditEvent(data: {
  actorId: string
  eventType: string
  resourceId?: string | null
  createdAt: Date
}): string {
  const payload = JSON.stringify({
    actorId: data.actorId,
    eventType: data.eventType,
    resourceId: data.resourceId,
    timestamp: data.createdAt.getTime(),
  })

  return crypto
    .createHmac('sha256', config.jwtSecret) // Re-using JWT_SECRET as a signing salt
    .update(payload)
    .digest('hex')
}

/**
 * Verifies if an audit event signature matches its data.
 */
export function verifyAuditEvent(
  data: { actorId: string; eventType: string; resourceId?: string | null; createdAt: Date },
  signature: string
): boolean {
  const expected = signAuditEvent(data)
  return signature === expected
}
