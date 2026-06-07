'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button/Button'
import { Input } from '@/components/ui/Input/Input'
import styles from './ProjectCreateForm.module.css'

const BUILD_TYPES = [
  'Residential (Bungalow)',
  'Residential (Duplex / Storey)',
  'Semi-detached / Terrace',
  'Apartment Block',
  'Commercial',
  'Mixed-use',
  'Renovation / Extension',
]

const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue',
  'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu',
  'FCT - Abuja', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina',
  'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo',
  'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
]

export function ProjectCreateForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [streetNumber, setStreetNumber] = useState('')
  const [streetName, setStreetName] = useState('')
  const [lga, setLga] = useState('')
  const [state, setState] = useState('')
  const [googleMapsPin, setGoogleMapsPin] = useState('')
  const [buildType, setBuildType] = useState('')
  const [totalBudget, setTotalBudget] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          streetNumber,
          streetName,
          lga,
          state,
          googleMapsPin: googleMapsPin || undefined,
          buildType: buildType || undefined,
          totalBudget: totalBudget ? parseFloat(totalBudget) : undefined,
          currency: 'NGN',
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.issues) {
          setError(data.issues.map((i: { message: string }) => i.message).join(', '))
        } else {
          setError(data.error || 'Failed to create project')
        }
        setIsLoading(false)
        return
      }

      router.push(`/projects/${data.data.projectId}/milestones`)
    } catch {
      setError('A network error occurred. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} id="project-create-form">
      <div className={styles.header}>
        <h1 className={styles.title}>New Project</h1>
        <p className={styles.description}>
          Your 12 construction milestones will be created automatically using the
          Nigerian Residential Template. You can set budgets on the next step.
        </p>
      </div>

      {error && (
        <div role="alert" className={styles.errorAlert}>
          {error}
        </div>
      )}

      {/* Project Name */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Project Details</h2>
        <div className={styles.fieldGroup}>
          <Input
            id="project-name"
            label="Project name"
            type="text"
            required
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Lekki Phase 1 Build"
          />
        </div>
      </div>

      {/* Site Address */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Site Address</h2>
        <div className={styles.addressRow}>
          <div className={styles.addressNumberField}>
            <Input
              id="project-street-number"
              label="Street No."
              type="text"
              required
              value={streetNumber}
              onChange={e => setStreetNumber(e.target.value)}
              placeholder="e.g. 14"
              suppressHydrationWarning
            />
          </div>
          <div className={styles.addressStreetField}>
            <Input
              id="project-street-name"
              label="Street name"
              type="text"
              required
              value={streetName}
              onChange={e => setStreetName(e.target.value)}
              placeholder="e.g. Admiralty Way"
              suppressHydrationWarning
            />
          </div>
        </div>
        <div className={styles.addressRow}>
          <div className={styles.addressHalfField}>
            <Input
              id="project-lga"
              label="Local Government Area"
              type="text"
              required
              value={lga}
              onChange={e => setLga(e.target.value)}
              placeholder="e.g. Eti-Osa"
              suppressHydrationWarning
            />
          </div>
          <div className={styles.addressHalfField}>
            <div className={styles.selectWrapper}>
              <label htmlFor="project-state" className={styles.selectLabel}>
                State <span aria-hidden="true">*</span>
              </label>
              <select
                id="project-state"
                className={styles.select}
                value={state}
                required
                onChange={e => setState(e.target.value)}
              >
                <option value="">Select state…</option>
                {NIGERIAN_STATES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Google Maps Pin — optional */}
        <div className={styles.mapsPinWrapper}>
          <Input
            id="project-maps-pin"
            label="Google Maps pin"
            type="url"
            value={googleMapsPin}
            onChange={e => setGoogleMapsPin(e.target.value)}
            placeholder="https://maps.app.goo.gl/…"
            helperText="Optional. Paste a Google Maps link to the site. Used to cross-verify proxy GPS on AI reports."
            suppressHydrationWarning
          />
          <p className={styles.pinHint}>
            How to get this: open Google Maps → long-press your site → tap &quot;Share&quot; → copy link.
          </p>
        </div>
      </div>

      {/* Build Information */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Build Information <span className={styles.optional}>(optional)</span></h2>
        <div className={styles.fieldGroup}>
          <div className={styles.selectWrapper}>
            <label htmlFor="project-build-type" className={styles.selectLabel}>
              Build type
            </label>
            <select
              id="project-build-type"
              className={styles.select}
              value={buildType}
              onChange={e => setBuildType(e.target.value)}
            >
              <option value="">Select build type…</option>
              {BUILD_TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <Input
            id="project-total-budget"
            label="Total budget (₦)"
            type="number"
            value={totalBudget}
            onChange={e => setTotalBudget(e.target.value)}
            placeholder="e.g. 45000000"
            helperText="Used to track cost against milestones. You can update this later."
          />
        </div>
      </div>

      <div className={styles.actions}>
        <Button
          id="project-create-submit"
          type="submit"
          fullWidth
          isLoading={isLoading}
        >
          Create project &amp; configure milestones →
        </Button>
      </div>
    </form>
  )
}
