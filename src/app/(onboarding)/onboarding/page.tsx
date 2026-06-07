import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { OnboardingWizard } from '@/modules/onboarding/components/OnboardingWizard'

export default async function OnboardingPage() {
  const session = await getSession()
  if (!session || session.role !== 'owner') redirect('/login')

  return <OnboardingWizard />
}
