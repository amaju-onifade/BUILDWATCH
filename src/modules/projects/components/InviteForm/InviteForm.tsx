'use client'

import React, { useState } from 'react'
import styles from './InviteForm.module.css'

type Member = {
  userId: string
  user: { fullName: string; email: string }
  role: string
}

type Props = {
  projectId: string
  members: Member[]
}

export function InviteForm({ projectId, members }: Props) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'proxy' | 'contractor'>('proxy')
  const [result, setResult] = useState<{ inviteUrl: string; whatsappUrl: string } | null>(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setResult(null)
    setIsLoading(true)

    try {
      const res = await fetch(`/api/projects/${projectId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to generate invite')
        setIsLoading(false)
        return
      }
      setResult(data.data)
      setEmail('')
    } catch {
      setError('Network error — please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const copyLink = async () => {
    if (!result) return
    try {
      await navigator.clipboard.writeText(result.inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
    }
  }

  return (
    <div className={styles.card}>
      <h3 className={styles.title}>Invite team members</h3>

      {members.length === 0 ? (
        <p className={styles.emptyText}>No team members yet.</p>
      ) : (
        <div className={styles.memberList}>
          {members.map((m) => (
            <div key={m.userId} className={styles.memberRow}>
              <div className={styles.memberInfo}>
                <span className={styles.memberName}>{m.user.fullName}</span>
                <span className={styles.memberEmail}>{m.user.email}</span>
              </div>
              <span className={styles.memberRole}>
                {m.role === 'proxy' ? 'Site Proxy' : 'Contractor'}
              </span>
            </div>
          ))}
        </div>
      )}

      <p className={styles.subtitle}>
        Invite a site proxy or contractor to submit progress photos and reports.
      </p>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.row}>
          <div className={styles.inputWrap}>
            <label htmlFor="invite-email" className={styles.label}>Email address</label>
            <input
              id="invite-email"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="cole@example.com"
              className={styles.input}
              suppressHydrationWarning={true}
            />
          </div>
          <div className={styles.selectWrap}>
            <label htmlFor="invite-role" className={styles.label}>Role</label>
            <select
              id="invite-role"
              value={role}
              onChange={e => setRole(e.target.value as 'proxy' | 'contractor')}
              className={styles.select}
              suppressHydrationWarning={true}
            >
              <option value="proxy">Site Proxy</option>
              <option value="contractor">Contractor</option>
            </select>
          </div>
        </div>

        {error && <div className={styles.error} role="alert">{error}</div>}

        <button type="submit" className={styles.submitBtn} disabled={isLoading}>
          {isLoading ? 'Generating...' : 'Generate invite link'}
        </button>
      </form>

      {result && (
        <div className={styles.resultCard}>
          <p className={styles.resultLabel}>Invite link generated</p>
          <div className={styles.linkRow}>
            <code className={styles.linkCode}>{result.inviteUrl}</code>
            <button type="button" className={styles.copyBtn} onClick={copyLink}>
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <a
            href={result.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.whatsappBtn}
          >
            Share via WhatsApp
          </a>
        </div>
      )}
    </div>
  )
}
