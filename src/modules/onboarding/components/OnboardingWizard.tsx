'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Check } from 'lucide-react'
import { Button } from '@/components/ui/Button/Button'
import { Input } from '@/components/ui/Input/Input'
import styles from './OnboardingWizard.module.css'

const STEP_LABELS = ['Project Details', 'Set Budgets', 'Invite Team']
const BUILD_TYPES = ['Residential', 'Commercial', 'Industrial', 'Road / Infrastructure', 'Renovation']
const NIGERIAN_STATES = [
  'Abia', 'Abuja', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue',
  'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'Gombe',
  'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara',
  'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau',
  'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
]

type Step1Data = {
  name: string
  streetNumber: string
  streetName: string
  lga: string
  state: string
  buildType: string
  totalBudget: string
}

type MilestoneDraft = {
  id: string
  name: string
  order: number
  budget: string
  completed: boolean
}

type Step3Data = {
  email: string
  role: 'proxy' | 'contractor'
}

const emptyStep1 = (): Step1Data => ({
  name: '',
  streetNumber: '',
  streetName: '',
  lga: '',
  state: '',
  buildType: '',
  totalBudget: '',
})

export function OnboardingWizard() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Step 1
  const [step1, setStep1] = useState<Step1Data>(emptyStep1)
  const [projectId, setProjectId] = useState<string | null>(null)

  // Step 2
  const [milestones, setMilestones] = useState<MilestoneDraft[]>([])

  // Step 3
  const [step3, setStep3] = useState<Step3Data>({ email: '', role: 'proxy' })
  const [inviteSent, setInviteSent] = useState(false)

  const updateStep1 = (patch: Partial<Step1Data>) =>
    setStep1(prev => ({ ...prev, ...patch }))

  const handleCreateProject = async () => {
    setLoading(true)
    setError('')
    try {
      const body = {
        name: step1.name,
        streetNumber: step1.streetNumber,
        streetName: step1.streetName,
        lga: step1.lga,
        state: step1.state,
        buildType: step1.buildType || undefined,
        totalBudget: step1.totalBudget ? parseFloat(step1.totalBudget) : undefined,
        currency: 'NGN',
      }

      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to create project')
        setLoading(false)
        return
      }

      setProjectId(data.data.projectId)

      // Fetch milestones
      const msRes = await fetch(`/api/projects/${data.data.projectId}/milestones`)
      const msData = await msRes.json()

      if (msData.data) {
        setMilestones(
          msData.data.map((m: any) => ({
            id: m.id,
            name: m.name,
            order: m.order,
            budget: m.plannedCostTotal?.toString() ?? '',
            completed: m.status === 'approved',
          }))
        )
      }

      setLoading(false)
      setStep(1)
    } catch {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  const updateMilestone = (id: string, patch: Partial<MilestoneDraft>) => {
    setMilestones(prev =>
      prev.map(m => (m.id === id ? { ...m, ...patch } : m))
    )
  }

  const handleSaveBudgets = async () => {
    setLoading(true)
    setError('')

    try {
      for (const ms of milestones) {
        const budget = parseFloat(ms.budget) || 0
        if (budget <= 0 && !ms.completed) continue

        await fetch(`/api/milestones/${ms.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            plannedCostTotal: budget || 0,
            paymentScheduleType: 'single',
            ...(ms.completed ? { status: 'approved' as const } : {}),
          }),
        })
      }

      setLoading(false)
      setStep(2)
    } catch {
      setError('Failed to save budgets.')
      setLoading(false)
    }
  }

  const handleSendInvite = async () => {
    if (!step3.email.trim()) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch(`/api/projects/${projectId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: step3.email, role: step3.role }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to send invite')
        setLoading(false)
        return
      }

      setInviteSent(true)
      setLoading(false)
    } catch {
      setError('Network error.')
      setLoading(false)
    }
  }

  const handleFinish = () => {
    router.push('/dashboard')
    router.refresh()
  }

  const canProceedStep1 =
    step1.name.length >= 2 &&
    step1.streetNumber.length >= 1 &&
    step1.streetName.length >= 2 &&
    step1.lga.length >= 2 &&
    step1.state.length >= 2

  return (
    <div className={styles.container}>
      {/* Progress bar */}
      <div className={styles.progress}>
        {STEP_LABELS.map((label, i) => (
          <div key={i} className={styles.progressStep} data-active={i <= step}>
            <div className={styles.progressDot} data-active={i <= step}>
              {i < step ? <Check size={14} /> : i + 1}
            </div>
            <span className={styles.progressLabel}>{label}</span>
          </div>
        ))}
      </div>

      <div className={styles.card}>
        {/* Step 1: Project Details */}
        {step === 0 && (
          <div>
            <h2 className={styles.title}>Create your project</h2>
            <p className={styles.desc}>Tell us about your construction project.</p>

            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.formGrid}>
              <div className={styles.fieldSpan}>
                <Input
                  label="Project name"
                  value={step1.name}
                  onChange={e => updateStep1({ name: e.target.value })}
                  placeholder="e.g. My Home Project"
                />
              </div>

              <Input
                label="Street number"
                value={step1.streetNumber}
                onChange={e => updateStep1({ streetNumber: e.target.value })}
                placeholder="e.g. 42"
              />
              <Input
                label="Street name"
                value={step1.streetName}
                onChange={e => updateStep1({ streetName: e.target.value })}
                placeholder="e.g. Adeola Odeku"
              />

              <Input
                label="LGA"
                value={step1.lga}
                onChange={e => updateStep1({ lga: e.target.value })}
                placeholder="e.g. Ikeja"
              />
              <select
                className={styles.select}
                value={step1.state}
                onChange={e => updateStep1({ state: e.target.value })}
              >
                <option value="">Select state</option>
                {NIGERIAN_STATES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              <div className={styles.fieldSpan}>
                <select
                  className={styles.select}
                  value={step1.buildType}
                  onChange={e => updateStep1({ buildType: e.target.value })}
                >
                  <option value="">Build type (optional)</option>
                  {BUILD_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className={styles.fieldSpan}>
                <Input
                  label="Total budget (₦) — optional"
                  type="number"
                  value={step1.totalBudget}
                  onChange={e => updateStep1({ totalBudget: e.target.value })}
                  placeholder="e.g. 15000000"
                />
              </div>
            </div>

            <div className={styles.actions}>
              <Button
                fullWidth
                disabled={!canProceedStep1}
                isLoading={loading}
                onClick={handleCreateProject}
              >
                Continue <ArrowRight size={16} />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Set Budgets */}
        {step === 1 && (
          <div>
            <h2 className={styles.title}>Set phase budgets</h2>
            <p className={styles.desc}>Allocate budget to each milestone. Mark any that are already completed.</p>

            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.milestoneList}>
              {milestones.map(ms => (
                <div key={ms.id} className={styles.milestoneRow} data-completed={ms.completed}>
                  <div className={styles.msLeft}>
                    <span className={styles.msOrder}>{ms.order}</span>
                    <span className={styles.msName}>{ms.name}</span>
                  </div>
                  <div className={styles.msRight}>
                    <input
                      type="number"
                      className={styles.msInput}
                      placeholder="Budget (₦)"
                      value={ms.budget}
                      onChange={e => updateMilestone(ms.id, { budget: e.target.value })}
                    />
                    <label className={styles.msCheck}>
                      <input
                        type="checkbox"
                        checked={ms.completed}
                        onChange={e => updateMilestone(ms.id, { completed: e.target.checked })}
                      />
                      Done
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.actions}>
              <Button fullWidth isLoading={loading} onClick={handleSaveBudgets}>
                Continue <ArrowRight size={16} />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Invite Team */}
        {step === 2 && (
          <div>
            <h2 className={styles.title}>Invite your team</h2>
            <p className={styles.desc}>
              Add a site proxy or contractor who will submit photo updates from the field.
            </p>

            {error && <div className={styles.error}>{error}</div>}

            {!inviteSent ? (
              <div className={styles.inviteForm}>
                <Input
                  label="Email address"
                  type="email"
                  value={step3.email}
                  onChange={e => setStep3(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="proxy@example.com"
                />

                <select
                  className={styles.select}
                  value={step3.role}
                  onChange={e => setStep3(prev => ({ ...prev, role: e.target.value as 'proxy' | 'contractor' }))}
                >
                  <option value="proxy">Site Proxy</option>
                  <option value="contractor">Contractor</option>
                </select>

                <Button fullWidth isLoading={loading} onClick={handleSendInvite}>
                  Send invite <ArrowRight size={16} />
                </Button>
              </div>
            ) : (
              <div className={styles.inviteSent}>
                <Check size={32} />
                <p>Invite sent! Your team member will receive an email to join.</p>
              </div>
            )}

            <div className={styles.actions}>
              <Button fullWidth variant="secondary" onClick={handleFinish}>
                {inviteSent ? 'Go to dashboard' : 'Skip — go to dashboard'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
