export async function deliverInviteByEmail(params: {
  inviteUrl: string
  inviteeEmail: string
  projectName: string
  role: 'proxy' | 'contractor'
  ownerName: string
}): Promise<void> {
  // Stub for Resend integration logic — replaced when Notification module is ready.
  console.log(`[STUB: Resend] Sending email to ${params.inviteeEmail}... Invite URL: ${params.inviteUrl}`)
  return Promise.resolve()
}

export function buildWhatsAppShareUrl(inviteUrl: string, projectName: string): string {
  const message = encodeURIComponent(
    `You've been invited to track the ${projectName} project on BuildWatch. Tap the link to get started: ${inviteUrl}`
  )
  return `https://wa.me/?text=${message}`
}
