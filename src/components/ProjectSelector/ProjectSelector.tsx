'use client'

import { useState, useRef, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import styles from './ProjectSelector.module.css'

type Project = {
  id: string
  name: string
}

type Props = {
  projects: Project[]
}

export function ProjectSelector({ projects }: Props) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const activeProject = projects.find(p => pathname.startsWith(`/projects/${p.id}`))
  const activeName = activeProject?.name

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div className={styles.wrapper} ref={ref}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <span className={styles.label}>{activeName || 'Select project'}</span>
        <ChevronDown size={16} className={styles.chevron} data-open={open} />
      </button>

      {open && (
        <div className={styles.menu}>
          {projects.map(p => {
            const isActive = p.id === activeProject?.id
            return (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className={styles.item}
                data-active={isActive}
                onClick={() => setOpen(false)}
              >
                {p.name}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
