'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button/Button'
import { Input } from '@/components/ui/Input/Input'
import styles from './LoginForm.module.css'

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to login')
        setIsLoading(false)
        return
      }

      router.push('/dashboard')
      router.refresh() // Ensure server components re-fetch with new session
    } catch {
      setError('A network error occurred. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.header}>
        <h2 className={styles.title}>Welcome back to BuildWatch</h2>
        <p className={styles.description}>Log in to manage your construction projects.</p>
      </div>

      {error && <div className={styles.errorAlert}>{error}</div>}

      <div className={styles.inputGroup}>
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
          placeholder="••••••••"
        />
      </div>

      <Button type="submit" fullWidth isLoading={isLoading}>
        Log in
      </Button>
      
      <p className={styles.footer}>
        Don&apos;t have an account? <a href="/register" className={styles.link}>Sign up</a>
      </p>
    </form>
  )
}
