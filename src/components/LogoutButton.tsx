'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Props = {
  className?: string
}

export function LogoutButton({ className }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleLogout = async () => {
    setLoading(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // proceed even if network fails — cookie clear happens below
    }
    router.push('/login')
    router.refresh()
  }

  return (
    <button type="button" onClick={handleLogout} disabled={loading} className={className}>
      {loading ? 'Logging out...' : 'Log out'}
    </button>
  )
}
