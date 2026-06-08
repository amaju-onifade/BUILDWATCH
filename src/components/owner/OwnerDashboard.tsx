'use client'

import { useRouter } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import HeartbeatBanner from './components/HeartbeatBanner'
import ActionRequiredBanner from './components/ActionRequiredBanner'
import StatCard from './components/StatCard'
import ProgressCard from './components/ProgressCard'
import SubmissionPreview from './components/SubmissionPreview'
import ActivityChart from './components/ActivityChart'
import AIAnomalyAlert from './components/AIAnomalyAlert'
import InspectorCTA from './components/InspectorCTA'
import styles from './OwnerDashboard.module.css'
import type { HeartbeatState } from './components/HeartbeatBanner'
import type { StatVariant } from './components/StatCard'

export interface DashboardData {
  projectName: string
  daysSinceLastUpdate: number
  lastSubmittedBy: string
  lastSubmissionDate: string
  currentPhase: string
  currentPhaseNumber: number
  totalPhases: number
  progressPercent: number
  estimatedCompletion: string
  totalBudget: string
  budgetRemaining: string
  actionsRequired: number
  actionsDetail: string
  aiAnomalyFlagged: boolean
  aiAnomalyMessage: string
}

function getHeartbeatState(days: number): HeartbeatState {
  if (days <= 2) return 'active'
  if (days <= 5) return 'warning'
  return 'overdue'
}

export type OwnerDashboardProps = {
  data: DashboardData
}

export default function OwnerDashboard({ data }: OwnerDashboardProps) {
  const router = useRouter()
  const heartbeatState = getHeartbeatState(data.daysSinceLastUpdate)
  const warningVariant: StatVariant = 'warning'
  const primaryVariant: StatVariant = 'primary'
  const errorVariant: StatVariant = 'error'

  const handleNotifications = () => {
    router.push('/dashboard/milestones')
  }

  const handleChaseProxy = () => {
    fetch('/api/cron/heartbeat', { method: 'POST' }).catch(() => {})
  }

  const handleReview = () => {
    router.push('/dashboard/milestones')
  }

  const handleViewReport = () => {
    router.push('/dashboard/milestones')
  }

  const handleRegisterInterest = () => {
    router.push('/inspectors')
  }

  return (
    <div className={styles.shell}>
      <Sidebar activeItem="Overview" projectName={data.projectName} />
      <div className={styles.mainArea}>
        <Topbar title="Overview" onNotificationClick={handleNotifications} />
        <div className={styles.content}>
          {/* Above the fold — all 4 elements visible on 1280px */}
          <HeartbeatBanner
            state={heartbeatState}
            daysSinceLastUpdate={data.daysSinceLastUpdate}
            lastSubmittedBy={data.lastSubmittedBy}
            lastSubmissionDate={data.lastSubmissionDate}
            onChaseProxy={handleChaseProxy}
          />

          <ActionRequiredBanner
            count={data.actionsRequired}
            message={`You have ${data.actionsDetail}`}
            onReview={handleReview}
          />

          <div className={styles.statGrid}>
            <StatCard
              label="Days since last update"
              value={String(data.daysSinceLastUpdate)}
              sub={<><AlertTriangle size={12} /> Last: {data.lastSubmittedBy} · {data.lastSubmissionDate}</>}
              variant={warningVariant}
            />
            <StatCard
              label="Current phase"
              value={data.currentPhase}
              sub={`Phase ${data.currentPhaseNumber} of ${data.totalPhases} · ${data.progressPercent}% complete`}
            />
            <StatCard
              label="Budget remaining"
              value={data.budgetRemaining}
              sub={`of ${data.totalBudget} total`}
              variant={primaryVariant}
            />
            <StatCard
              label="Action required"
              value={String(data.actionsRequired)}
              sub={data.actionsDetail}
              variant={errorVariant}
            />
          </div>

          <ProgressCard
            currentPhaseNumber={data.currentPhaseNumber}
            totalPhases={data.totalPhases}
            progressPercent={data.progressPercent}
            estimatedCompletion={data.estimatedCompletion}
          />

          {/* Below the fold */}
          <div className={styles.row}>
            <SubmissionPreview
              submittedBy={data.lastSubmittedBy}
              submissionDate={data.lastSubmissionDate}
              phaseName={`Phase ${data.currentPhaseNumber} — ${data.currentPhase}`}
            />
            <ActivityChart />
          </div>

          {data.aiAnomalyFlagged && (
            <div className={styles.aiAlertRow}>
              <AIAnomalyAlert message={data.aiAnomalyMessage} onViewReport={handleViewReport} />
            </div>
          )}

          <InspectorCTA onRegisterInterest={handleRegisterInterest} />
        </div>
      </div>
    </div>
  )
}
