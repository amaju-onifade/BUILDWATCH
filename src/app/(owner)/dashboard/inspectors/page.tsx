import type { Metadata } from 'next'
import { requirePageUser } from '@/lib/page'
import InspectorsPage from '@/components/owner/InspectorsPage'

export const metadata: Metadata = {
  title: 'Inspector Network — BuildWatch',
  description: 'Register your interest for certified on-site inspection services.',
}

export default async function InspectorsRoute() {
  const user = await requirePageUser()
  return <InspectorsPage userName={user.fullName} userInitials={user.initials} userPlan={user.plan} />
}
