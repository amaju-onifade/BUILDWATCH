import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { InspectorRegistration } from '@/modules/inspectors/components/InspectorRegistration'

export const metadata: Metadata = {
  title: 'Inspectors — BuildWatch',
  description: 'Find certified construction inspectors.',
}

export default async function InspectorsPage() {
  const session = await getSession()
  if (!session || session.role !== 'owner') redirect('/login')

  return <InspectorRegistration />
}
