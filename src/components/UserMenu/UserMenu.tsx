'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Settings, LogOut } from 'lucide-react'
import styles from './UserMenu.module.css'

type Props = {
  userName: string
}

export function UserMenu({ userName }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleLogout = async () => {
    setLoading(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {}
    router.push('/login')
    router.refresh()
  }

  return (
    <div className={styles.wrapper} ref={ref}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <span className={styles.avatar}>{userName.charAt(0).toUpperCase()}</span>
        <span className={styles.name}>{userName}</span>
      </button>

      {open && (
        <div className={styles.menu}>
          <button
            type="button"
            className={styles.menuItem}
            onClick={() => { setOpen(false); router.push('/settings') }}
          >
            <Settings size={16} />
            Settings
          </button>
          <button
            type="button"
            className={styles.menuItem}
            onClick={handleLogout}
            disabled={loading}
          >
            <LogOut size={16} />
            {loading ? 'Logging out...' : 'Log out'}
          </button>
        </div>
      )}
    </div>
  )
}
