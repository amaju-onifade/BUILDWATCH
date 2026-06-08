'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import { ProjectDetailsForm } from './components/ProjectDetailsForm'
import type { ProjectDetailsFormData } from './components/ProjectDetailsForm'
import { GPSAnchor } from './components/GPSAnchor'
import { MilestoneTemplateList, DEFAULT_MILESTONES } from './components/MilestoneTemplateList'
import { PaymentScheduleCard } from './components/PaymentScheduleCard'
import { InviteTeam } from './components/InviteTeam'
import { SetupFooter } from './components/SetupFooter'
import styles from './ProjectSetup.module.css'

const DEFAULT_PROJECT_DETAILS: ProjectDetailsFormData = {
  projectName: 'Village Home — Ikeja, Gombe',
  state: 'Gombe State',
  lga: 'Ikeja',
  buildType: 'Residential — Duplex',
  currency: '₦',
  totalBudget: '9,000,000',
  startDate: '2026-03-01',
}

export default function ProjectSetup() {
  const router = useRouter()
  const [projectDetails, setProjectDetails] = useState<ProjectDetailsFormData>(DEFAULT_PROJECT_DETAILS)
  const [gpsMethod, setGpsMethod] = useState<'address' | 'pin' | 'proxy'>('address')
  const [selectedMilestoneId, setSelectedMilestoneId] = useState('m3')

  const handleSaveDraft = () => {
    localStorage.setItem('buildwatch_project_draft', JSON.stringify(projectDetails))
    alert('Project draft saved!')
  }

  const handleContinue = () => {
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
        <Topbar title="New Project Setup">
          <button
            type="button"
            className={styles.topGhostBtn}
            onClick={handleSaveDraft}
          >
            Save draft
          </button>
          <button
            type="button"
            className={styles.topPrimaryBtn}
            onClick={handleContinue}
          >
            Continue <ArrowRight size={16} />
          </button>
        </Topbar>

        <div className={styles.content}>
          <div className={styles.grid}>
            <div className={styles.leftCol}>
              <ProjectDetailsForm data={projectDetails} onChange={setProjectDetails} />
              <GPSAnchor gpsMethod={gpsMethod} onChange={setGpsMethod} />
            </div>
            <div className={styles.rightCol}>
              <MilestoneTemplateList
                selectedMilestoneId={selectedMilestoneId}
                onSelectMilestone={setSelectedMilestoneId}
              />
              {selectedMilestoneId && (
                <PaymentScheduleCard
                  milestone={DEFAULT_MILESTONES.find(m => m.id === selectedMilestoneId)!}
                />
              )}
              <InviteTeam proxyStatus="pending" contractorStatus="none" />
            </div>
          </div>
        </div>

        <SetupFooter onSaveDraft={handleSaveDraft} onContinue={handleContinue} />
      </div>
    </div>
  )
}
