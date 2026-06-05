import { Resend } from 'resend'
import { logger } from '@/lib/logger'
import { config } from '@/lib/config'

const resend = new Resend(config.resendApiKey)

export type EmailPayload = {
  to: string
  subject: string
  html: string
}

/**
 * Sends a transactional email via Resend.
 * Failures are logged but never thrown — callers must not depend on delivery.
 */
export async function sendEmail(payload: EmailPayload): Promise<void> {
  try {
    const { error } = await resend.emails.send({
      from: 'BuildWatch <notifications@buildwatch.app>',
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    })

    if (error) {
      logger.warn('Resend delivery failure', {
        module: 'notifications',
        to: payload.to,
        subject: payload.subject,
        error: { message: error.message },
      })
    } else {
      logger.info('Email sent', {
        module: 'notifications',
        to: payload.to,
        subject: payload.subject,
      })
    }
  } catch (err) {
    // Non-fatal — log and continue per external service failure policy
    logger.error('Resend threw unexpectedly', {
      module: 'notifications',
      error: { message: (err as Error).message },
    })
  }
}
