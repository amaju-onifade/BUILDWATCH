'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button/Button'
import { Input } from '@/components/ui/Input/Input'
import styles from './RedeemInviteForm.module.css'

interface RedeemInviteFormProps {
  token: string
}

export function RedeemInviteForm({ token }: RedeemInviteFormProps) {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/auth/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, fullName, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.issues) {
          setError(data.issues.map((i: any) => i.message).join(', '))
        } else {
          setError(data.error || 'Failed to redeem invite')
        }
        setIsLoading(false)
        return
      }

      window.location.href = '/field'
    } catch {
      setError('A network error occurred. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.header}>
        <h2 className={styles.title}>Accept your invitation</h2>
        <p className={styles.description}>Set up your profile to join the project.</p>
      </div>

      {error && <div className={styles.errorAlert}>{error}</div>}

      <div className={styles.inputGroup}>
        <Input
          label="Full Name"
          type="text"
          required
          value={fullName}
          onChange={e => setFullName(e.target.value)}
          placeholder="Jane Doe"
        />
        <Input
          label="Create a Password"
          type="password"
          required
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Min. 8 characters"
          helperText="Must be at least 8 characters long."
        />
      </div>

      <Button type="submit" fullWidth isLoading={isLoading}>
        Join Project
      </Button>
    </form>
  )
}
