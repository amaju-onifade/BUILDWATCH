import { sendEmail } from '@/modules/notifications/lib/sendEmail'
import { config } from '@/lib/config'

export async function deliverInviteByEmail(params: {
  inviteUrl: string
  inviteeEmail: string
  projectName: string
  role: 'proxy' | 'contractor'
  ownerName: string
}): Promise<void> {
  const roleLabel = params.role === 'proxy' ? 'Site Proxy' : 'Contractor'
  const html = `
    <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;color:#1f2937;">
      <div style="background:#0F6D4E;padding:24px;border-radius:12px 12px 0 0;">
        <h1 style="color:white;margin:0;font-size:22px;">BuildWatch</h1>
        <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:14px;">You're invited to join a project</p>
      </div>
      <div style="background:white;border:1px solid #e5e7eb;border-top:none;padding:32px;border-radius:0 0 12px 12px;">
        <p>Hi there,</p>
        <p><strong>${params.ownerName}</strong> has invited you to join <strong>${params.projectName}</strong> on BuildWatch as a <strong>${roleLabel}</strong>.</p>
        <p style="color:#6b7280;">Click the button below to accept the invitation and start tracking progress.</p>
        <a href="${params.inviteUrl}" style="display:inline-block;background:#0F6D4E;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:16px;">Accept Invitation →</a>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0;">
        <p style="color:#9ca3af;font-size:12px;">This invitation was sent by the project owner via BuildWatch. If you weren't expecting this, you can ignore this email.</p>
      </div>
    </div>
  `

  await sendEmail({
    to: params.inviteeEmail,
    subject: `${params.ownerName} invited you to ${params.projectName} on BuildWatch`,
    html,
  })
}

export function buildWhatsAppShareUrl(inviteUrl: string, projectName: string): string {
  const message = encodeURIComponent(
    `You've been invited to track the ${projectName} project on BuildWatch. Tap the link to get started: ${inviteUrl}`
  )
  return `https://wa.me/?text=${message}`
}
