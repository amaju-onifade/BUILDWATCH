import type { Metadata } from 'next'
import Link from 'next/link'
import styles from './layout.module.css'

export const metadata: Metadata = {
  title: 'BuildWatch — Owner Dashboard',
  description: 'Monitor your construction projects, milestones and AI site reports.',
}

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <Link href="/dashboard" className={styles.brand}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="3" y="3" width="7" height="7" rx="1" fill="currentColor" opacity="0.8" />
            <rect x="14" y="3" width="7" height="7" rx="1" fill="currentColor" opacity="0.4" />
            <rect x="3" y="14" width="7" height="7" rx="1" fill="currentColor" opacity="0.4" />
            <rect x="14" y="14" width="7" height="7" rx="1" fill="currentColor" />
          </svg>
          BuildWatch
        </Link>

        <nav className={styles.nav} aria-label="Owner navigation">
          <span className={styles.navSection}>Main</span>
          <Link href="/dashboard" className={styles.navLink} id="nav-dashboard">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
            </svg>
            Dashboard
          </Link>
          <Link href="/dashboard/projects/new" className={styles.navLink} id="nav-new-project">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Project
          </Link>
        </nav>
      </aside>

      <main className={styles.content}>
        {children}
      </main>
    </div>
  )
}
