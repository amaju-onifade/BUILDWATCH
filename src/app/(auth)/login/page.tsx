import { LoginForm } from '@/modules/auth/components/LoginForm/LoginForm'
import { AuthLayout } from '@/modules/auth/components/AuthLayout/AuthLayout'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Log In | BuildWatch',
  description: 'Log in to your BuildWatch account.'
}

type Props = {
  searchParams: Promise<{ error?: string }>
}

export default async function LoginPage({ searchParams }: Props) {
  const { error } = await searchParams
  return (
    <AuthLayout>
      <LoginForm error={error} />
    </AuthLayout>
  )
}
