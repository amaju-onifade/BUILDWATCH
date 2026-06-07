import Link from 'next/link'
import Image from 'next/image'
import { LogoutButton } from '@/components/LogoutButton'
import styles from './layout.module.css'

export default function FieldLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <Link href="/field" className={styles.brand}>
          <Image src="/logo.png" alt="BuildWatch" width={110} height={30} />
        </Link>
        <nav className={styles.nav}>
          <Link href="/field" className={styles.navLink} id="nav-field-dashboard">
            My Projects
          </Link>
          <LogoutButton className={styles.logoutBtn} />
        </nav>
      </header>
      <main className={styles.content}>
        {children}
      </main>
    </div>
  )
}
