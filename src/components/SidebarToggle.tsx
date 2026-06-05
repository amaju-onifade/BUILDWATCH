'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export function SidebarToggle({ className }: { className?: string }) {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    document.documentElement.dataset.sidebar = collapsed ? 'collapsed' : 'expanded'
  }, [collapsed])

  return (
    <button
      type="button"
      onClick={() => setCollapsed(v => !v)}
      className={className}
      aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
    >
      {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
    </button>
  )
}
