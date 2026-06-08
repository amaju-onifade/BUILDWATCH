'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard,
  ClipboardList,
  Image,
  Wallet,
  ScrollText,
  Search,
  Settings,
  ChevronDown,
} from 'lucide-react'
import styles from './Sidebar.module.css'

const ICONS: Record<string, React.ReactNode> = {
  LayoutDashboard: <LayoutDashboard size={16} />,
  ClipboardList: <ClipboardList size={16} />,
  Image: <Image size={16} />,
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

const bottomNav: NavItem[] = [
  { label: 'Settings', icon: 'Settings', href: '/dashboard/settings' },
]

export type SidebarProps = {
  activeItem: string
  projectName?: string
  userName?: string
  userInitials?: string
  userPlan?: string
  mode?: 'dashboard' | 'setup'
  disabledItems?: string[]
}

export default function Sidebar({
  activeItem,
  projectName = 'Village Home — Ikeja',
  userName = 'Adaeze Okonkwo',
  userInitials = 'AD',
  userPlan = 'Standard Plan',
  mode = 'dashboard',
  disabledItems = [],
}: SidebarProps) {
  const router = useRouter()
  const [projectOpen, setProjectOpen] = useState(false)
  const projectRef = useRef<HTMLDivElement>(null)
  const navItems = mode === 'setup' ? setupNavItems : defaultNavItems

  const projects = [
    { id: 'p1', name: 'Village Home — Ikeja' },
    { id: 'p2', name: 'Shoprite — Lekki' },
    { id: 'p3', name: 'School Block — Aba' },
  ]

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (projectRef.current && !projectRef.current.contains(e.target as Node)) {
        setProjectOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <aside className={styles.sidebar}>
      <Link href="/dashboard" className={styles.logo}>
        <span className={styles.logoText}>
          Build<span className={styles.logoAccent}>Watch</span>
        </span>
      </Link>

      <div className={styles.projectSelectorWrapper} ref={projectRef}>
        <button
          type="button"
          className={styles.projectSelector}
          onClick={() => setProjectOpen(o => !o)}
        >
          <span className={styles.projectName}>{projectName}</span>
          <ChevronDown size={12} className={styles.chevron} data-open={projectOpen} />
        </button>
        {projectOpen && (
          <div className={styles.projectMenu}>
            {projects.map(p => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className={styles.projectItem}
                onClick={() => setProjectOpen(false)}
              >
                {p.name}
              </Link>
            ))}
          </div>
        )}
      </div>

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
        <div className={styles.navSpacer} />
        {bottomNav.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`${styles.navItem} ${activeItem === item.label ? styles.active : ''}`}
          >
            <span className={styles.navIcon}>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className={styles.footer}>
        <div className={styles.userRow}>
          <div className={styles.avatar}>{userInitials}</div>
          <div className={styles.userInfo}>
            <div className={styles.userName}>{userName}</div>
            <div className={styles.userPlan}>{userPlan}</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
