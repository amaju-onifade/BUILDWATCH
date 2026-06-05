import { RegisterForm } from '@/modules/auth/components/RegisterForm/RegisterForm'
import { AuthLayout } from '@/modules/auth/components/AuthLayout/AuthLayout'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign Up | BuildWatch',
  description: 'Start your free trial on BuildWatch.'
}

export default function RegisterPage() {
  return (
    <AuthLayout>
      <RegisterForm />
    </AuthLayout>
  )
}
