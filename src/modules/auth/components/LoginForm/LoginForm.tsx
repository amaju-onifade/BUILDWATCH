'use client'

import React, { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/Button/Button'
import { Input } from '@/components/ui/Input/Input'
import styles from './LoginForm.module.css'

export function LoginForm({ error: serverError }: { error?: string }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [clientError, setClientError] = useState(serverError || '')
  const [isLoading, setIsLoading] = useState(false)

  const error = serverError || clientError

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setClientError('')
    setIsLoading(true)

    if (!email.trim() || !password) {
      setClientError('Email and password are required.')
      setIsLoading(false)
      return
    }

    e.currentTarget.submit()
  }

  return (
    <form className={styles.form} action="/api/auth/login" method="POST" onSubmit={handleSubmit}>
      <div className={styles.header}>
        <h2 className={styles.title}>Welcome back!</h2>
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
          name="email"
          autoComplete="email"
        />
        <Input
          label="Password"
          type="password"
          required
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="••••••••"
          name="password"
          autoComplete="current-password"
        />
      </div>

      <Button type="submit" fullWidth isLoading={isLoading}>
        Log in <ArrowRight size={16} />
      </Button>

      <p className={styles.footer}>
        Don&apos;t have an account? <a href="/register" className={styles.link}>Sign up</a>
      </p>
    </form>
  )
}
