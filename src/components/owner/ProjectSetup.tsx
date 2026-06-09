'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Check, ChevronLeft } from 'lucide-react'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import { ProjectDetailsForm } from './components/ProjectDetailsForm'
import type { ProjectDetailsFormData } from './components/ProjectDetailsForm'
import { GPSAnchor } from './components/GPSAnchor'
import { MilestoneTemplateList, DEFAULT_MILESTONES } from './components/MilestoneTemplateList'
import type { MilestoneConfig } from './components/MilestoneTemplateList'
import { PaymentScheduleCard } from './components/PaymentScheduleCard'
import { InviteTeam } from './components/InviteTeam'
import styles from './ProjectSetup.module.css'

const STEPS = ['Project Details', 'Milestones & Budget', 'Invite Team']

export default function ProjectSetup() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [projectDetails, setProjectDetails] = useState<ProjectDetailsFormData>({
    projectName: '',
    state: '',
    lga: '',
    buildType: '',
    currency: '₦',
    totalBudget: '',
    startDate: '',
  })
  const [gpsMethod, setGpsMethod] = useState<'address' | 'pin' | 'proxy'>('address')
  const [selectedMilestoneId, setSelectedMilestoneId] = useState(DEFAULT_MILESTONES[0]?.id ?? '')

  const handleNext = () => {
    if (step < 2) setStep(s => s + 1)
  }

  const handleBack = () => {
    if (step > 0) setStep(s => s - 1)
  }

  const handleFinish = () => {
    router.push('/dashboard')
  }

  return (
    <div className={styles.shell}>
      <Sidebar
        activeItem="Project Setup"
        mode="setup"
        disabledItems={['Overview', 'Photo Log', 'Budget', 'Proxy Audit Trail', 'Inspectors']}
      />
      <div className={styles.mainArea}>
        <Topbar title="New Project Setup" />

        {/* Persistent progress bar */}
        <div className={styles.progressBar}>
          {STEPS.map((label, i) => (
            <div key={i} className={styles.progressStep} data-active={i <= step}>
              <div className={styles.progressDot} data-active={i <= step}>
                {i < step ? <Check size={14} /> : i + 1}
              </div>
              <span className={styles.progressLabel}>{label}</span>
            </div>
          ))}
        </div>

        <div className={styles.content}>
          {/* Step 1: Project Details */}
          {step === 0 && (
            <div className={styles.stepWrapper}>
              <h2 className={styles.stepTitle}>Tell us about your project</h2>
              <p className={styles.stepDesc}>Enter your project location and basic details.</p>
              <div className={styles.grid}>
                <ProjectDetailsForm data={projectDetails} onChange={setProjectDetails} />
                <GPSAnchor gpsMethod={gpsMethod} onChange={setGpsMethod} />
              </div>
              <div className={styles.navButtons}>
                <button type="button" className={styles.primaryBtn} onClick={handleNext}>
                  Continue <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Milestones & Budget */}
          {step === 1 && (
            <div className={styles.stepWrapper}>
              <h2 className={styles.stepTitle}>Set milestones & budgets</h2>
              <p className={styles.stepDesc}>Review your phase template and set budgets for each milestone.</p>
              <div className={styles.grid}>
                <MilestoneTemplateList
                  selectedMilestoneId={selectedMilestoneId}
                  onSelectMilestone={setSelectedMilestoneId}
                />
                {selectedMilestoneId && (
                  <PaymentScheduleCard
                    milestone={DEFAULT_MILESTONES.find(m => m.id === selectedMilestoneId)!}
                  />
                )}
              </div>
              <div className={styles.navButtons}>
                <button type="button" className={styles.ghostBtn} onClick={handleBack}>
                  <ChevronLeft size={16} /> Back
                </button>
                <button type="button" className={styles.primaryBtn} onClick={handleNext}>
                  Continue <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Invite Team */}
          {step === 2 && (
            <div className={styles.stepWrapper}>
              <h2 className={styles.stepTitle}>Invite your team</h2>
              <p className={styles.stepDesc}>Add a site proxy or contractor to your project.</p>
              <InviteTeam proxyStatus="pending" contractorStatus="none" />
              <div className={styles.navButtons}>
                <button type="button" className={styles.ghostBtn} onClick={handleBack}>
                  <ChevronLeft size={16} /> Back
                </button>
                <button type="button" className={styles.primaryBtn} onClick={handleFinish}>
                  Go to dashboard <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
