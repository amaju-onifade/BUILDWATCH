import { LoginForm } from '@/modules/auth/components/LoginForm/LoginForm'
import { AuthLayout } from '@/modules/auth/components/AuthLayout/AuthLayout'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Log In | BuildWatch',
  description: 'Log in to your BuildWatch owner account.'
}

export default function LoginPage() {
  return (
    <AuthLayout>
      <LoginForm />
    </AuthLayout>
  )
}
