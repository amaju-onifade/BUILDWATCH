import type { Metadata } from 'next'
import Link from 'next/link'
import { LayoutGrid, Plus } from 'lucide-react'
import { SidebarToggle } from '@/components/SidebarToggle'
import { LogoutButton } from '@/components/LogoutButton'
import styles from './layout.module.css'

export const metadata: Metadata = {
  title: 'BuildWatch — Owner Dashboard',
  description: 'Monitor your construction projects, milestones and AI site reports.',
}

export default function OwnerLayout({
  children,
  context,
}: {
  children: React.ReactNode
  context: React.ReactNode
}) {
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <Link href="/dashboard" className={styles.brand}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="3" y="3" width="7" height="7" rx="1" fill="currentColor" opacity="0.8" />
              <rect x="14" y="3" width="7" height="7" rx="1" fill="currentColor" opacity="0.4" />
              <rect x="3" y="14" width="7" height="7" rx="1" fill="currentColor" opacity="0.4" />
              <rect x="14" y="14" width="7" height="7" rx="1" fill="currentColor" />
            </svg>
            BuildWatch
          </Link>
          <SidebarToggle className={styles.toggleBtn} />
        </div>

        <nav className={styles.nav}>
          <Link href="/dashboard" className={styles.navLink} id="nav-dashboard">
            <LayoutGrid size={20} />
            <span>Overview</span>
          </Link>
          <Link href="/dashboard/projects/new" className={styles.navLink} id="nav-new-project">
            <Plus size={20} />
            <span>New Project</span>
          </Link>
        </nav>

        <div className={styles.sidebarFooter}>
          <LogoutButton className={styles.logoutBtn} />
        </div>
      </aside>

      <div className={styles.mainArea}>
        {context}
        <main className={styles.content}>
          {children}
        </main>
      </div>
    </div>
  )
}
