'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  LayoutDashboard,
  ClipboardList,
  Image as ImageIcon,
  Wallet,
  ScrollText,
  Search,
  Settings,
  ChevronDown,
  ChevronUp,
  Plus,
} from 'lucide-react'
import { LogoutButton } from '@/components/LogoutButton'
import styles from './Sidebar.module.css'

const ICONS: Record<string, React.ReactNode> = {
  LayoutDashboard: <LayoutDashboard size={16} />,
  ClipboardList: <ClipboardList size={16} />,
  Image: <ImageIcon size={16} />,
  Wallet: <Wallet size={16} />,
  ScrollText: <ScrollText size={16} />,
  Search: <Search size={16} />,
  Settings: <Settings size={16} />,
}

type NavItem = {
  label: string
  icon: string
  href: string
  soon?: boolean
}

const defaultNavItems: NavItem[] = [
  { label: 'Overview', icon: 'LayoutDashboard', href: '/dashboard' },
  { label: 'Milestones', icon: 'ClipboardList', href: '/dashboard/milestones' },
  { label: 'Photo Log', icon: 'Image', href: '/dashboard/photos' },
  { label: 'Budget', icon: 'Wallet', href: '/dashboard/budget' },
  { label: 'Proxy Audit Trail', icon: 'ScrollText', href: '/dashboard/audit' },
  { label: 'Inspectors', icon: 'Search', href: '/dashboard/inspectors', soon: true },
]

const setupNavItems: NavItem[] = [
  { label: 'Overview', icon: 'LayoutDashboard', href: '/dashboard' },
  { label: 'Project Setup', icon: 'ClipboardList', href: '/projects/new' },
  { label: 'Photo Log', icon: 'Image', href: '/dashboard/photos' },
  { label: 'Budget', icon: 'Wallet', href: '/dashboard/budget' },
  { label: 'Proxy Audit Trail', icon: 'ScrollText', href: '/dashboard/audit' },
  { label: 'Inspectors', icon: 'Search', href: '/dashboard/inspectors' },
]

export type SidebarProps = {
  activeItem: string
  projectName?: string
  userName?: string
  userInitials?: string
  userPlan?: string
  mode?: 'dashboard' | 'setup'
  disabledItems?: string[]
  projects?: { id: string; name: string }[]
}

export default function Sidebar({
  activeItem,
  projectName = '',
  userName = '',
  userInitials = '',
  userPlan = 'Standard Plan',
  mode = 'dashboard',
  disabledItems = [],
  projects: initialProjects,
}: SidebarProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [projects, setProjects] = useState<{ id: string; name: string }[]>(initialProjects ?? [])
  const navItems = mode === 'setup' ? setupNavItems : defaultNavItems

  useEffect(() => {
    fetch('/api/projects')
      .then(r => r.ok ? r.json() : { data: [] })
      .then(res => {
        if (Array.isArray(res.data)) {
          setProjects(res.data)
        }
      })
      .catch(() => {})
  }, [projectName])

  return (
    <aside className={styles.sidebar}>
      <Link href="/dashboard" className={styles.logo}>
        <span className={styles.logoText}>
          Build<span className={styles.logoAccent}>Watch</span>
        </span>
      </Link>

      <nav className={styles.nav}>
        {mode === 'dashboard' && <div className={styles.navSection}>Main</div>}
        {navItems.map((item) => {
          const isDisabled = disabledItems.includes(item.label)
          return (
            <Link
              key={item.label}
              href={isDisabled ? '#' : item.href}
              className={`${styles.navItem} ${activeItem === item.label ? styles.active : ''} ${isDisabled ? styles.disabled : ''}`}
              onClick={isDisabled ? (e) => e.preventDefault() : undefined}
            >
            <span className={styles.navIcon}>{ICONS[item.icon]}</span>
              <span>{item.label}</span>
              {item.soon && <span className={styles.badgeSoon}>Soon</span>}
            </Link>
          )
        })}
        <div className={styles.navSection}>Projects ({projects.length})</div>
        {projects.map(p => (
          <Link
            key={p.id}
            href={`/projects/${p.id}`}
            className={`${styles.navItem} ${projectName === p.name ? styles.active : ''}`}
          >
            <span>{p.name}</span>
          </Link>
        ))}
        <Link href="/projects/new" className={styles.navItem}>
          <Plus size={16} />
          <span>Create New Project</span>
        </Link>
        <div className={styles.navSpacer} />
      </nav>

      <div className={styles.footer}>
        <button type="button" className={styles.userRow} onClick={() => setUserMenuOpen(v => !v)}>
          <div className={styles.avatar}>{userInitials || '?'}</div>
          <div className={styles.userInfo}>
            <div className={styles.userName}>{userName || 'User'}</div>
            <div className={styles.userPlan}>{userPlan}</div>
          </div>
          {userMenuOpen ? <ChevronUp size={14} className={styles.chevronIcon} /> : <ChevronDown size={14} className={styles.chevronIcon} />}
        </button>
        {userMenuOpen && (
          <div className={styles.userMenu}>
            <Link href="/dashboard/settings" className={styles.userMenuItem} onClick={() => setUserMenuOpen(false)}>
              <Settings size={14} /> Settings
            </Link>
            <LogoutButton className={styles.userMenuLogout} />
          </div>
        )}
      </div>
    </aside>
  )
}
