'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button/Button'
import { Input } from '@/components/ui/Input/Input'
import styles from './RegisterForm.module.css'

export function RegisterForm() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.issues) {
          setError(data.issues.map((i: any) => i.message).join(', '))
        } else {
          setError(data.error || 'Failed to register')
        }
        setIsLoading(false)
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('A network error occurred. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.header}>
        <h2 className={styles.title}>Create your account</h2>
        <p className={styles.description}>Start your 21-day free trial as a project owner.</p>
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
          label="Email address"
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="owner@example.com"
        />
        <Input
          label="Password"
          type="password"
          required
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Min. 8 characters"
          helperText="Must be at least 8 characters long."
        />
      </div>

      <Button type="submit" fullWidth isLoading={isLoading}>
        Sign up
      </Button>
      
      <p className={styles.footer}>
        Already have an account? <a href="/login" className={styles.link}>Log in</a>
      </p>
    </form>
  )
}
