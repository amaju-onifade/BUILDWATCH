import { RedeemInviteForm } from '@/modules/auth/components/RedeemInviteForm/RedeemInviteForm'
import { AuthLayout } from '@/modules/auth/components/AuthLayout/AuthLayout'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Accept Invitation | BuildWatch',
  description: 'Accept your invitation to join a BuildWatch project.'
}

type Props = {
  params: {
    token: string
  }
}

export default async function InvitePage({ params }: Props) {
  // We strictly await params for next 15 compatibility dynamically mapping if needed
  const token = params.token
  return (
    <AuthLayout>
      <RedeemInviteForm token={token} />
    </AuthLayout>
  )
}
