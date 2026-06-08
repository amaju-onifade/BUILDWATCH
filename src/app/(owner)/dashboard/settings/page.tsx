import type { Metadata } from 'next'
import { prisma } from '@/lib/db'
import { requirePageUser } from '@/lib/page'
import SettingsPage from '@/components/owner/SettingsPage'

export const metadata: Metadata = {
  title: 'Settings — BuildWatch',
  description: 'Account, notifications, subscription, and billing settings.',
}

export default async function SettingsRoute() {
  const user = await requirePageUser()

  const dbUser = await prisma.users.findUnique({
    where: { id: user.userId },
    select: { email: true, timezone: true },
  })

  return (
    <SettingsPage
      userName={user.fullName}
      userInitials={user.initials}
      userPlan={user.plan}
      userEmail={dbUser?.email ?? ''}
      userTimezone={dbUser?.timezone ?? 'Africa/Lagos (WAT)'}
    />
  )
}
