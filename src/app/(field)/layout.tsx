import Link from 'next/link'
import styles from './layout.module.css'

export default function FieldLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <Link href="/field" className={styles.brand}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="3" y="3" width="7" height="7" rx="1" fill="currentColor" opacity="0.8" />
            <rect x="14" y="3" width="7" height="7" rx="1" fill="currentColor" opacity="0.4" />
            <rect x="3" y="14" width="7" height="7" rx="1" fill="currentColor" opacity="0.4" />
            <rect x="14" y="14" width="7" height="7" rx="1" fill="currentColor" />
          </svg>
          BuildWatch
        </Link>
        <nav className={styles.nav}>
          <Link href="/field" className={styles.navLink} id="nav-field-dashboard">
            My Projects
          </Link>
        </nav>
      </header>
      <main className={styles.content}>
        {children}
      </main>
    </div>
  )
}
