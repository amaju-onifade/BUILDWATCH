import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { LayoutGrid, Milestone, Camera, Wallet, ScrollText, ShieldCheck, Settings } from 'lucide-react'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { SidebarToggle } from '@/components/SidebarToggle'
import { ProjectSelector } from '@/components/ProjectSelector/ProjectSelector'
import { UserMenu } from '@/components/UserMenu/UserMenu'
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
            <Image src="/logo.png" alt="BuildWatch" width={130} height={36} />
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
