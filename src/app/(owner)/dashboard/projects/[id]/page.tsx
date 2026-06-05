import React from 'react'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import styles from './page.module.css'

type Props = {
  params: Promise<{ id: string }>
}

export default async function ProjectDetailPage({ params }: Props) {
  const { id } = await params
  const session = await getSession()

  if (!session) return null

  const project = await prisma.projects.findFirst({
    where: { id, ownerId: session.userId },
    include: {
      milestones: {
        orderBy: { order: 'asc' },
      },
    },
  })

  if (!project) notFound()

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>{project.name}</h1>
        <p className={styles.subtitle}>{project.location}</p>
      </header>

      <section className={styles.milestones}>
        <h2>Milestones</h2>
        <div className={styles.list}>
          {project.milestones.map((m) => (
            <div key={m.id} className={styles.milestone}>
              <span>{m.name}</span>
              <span data-status={m.status}>{m.status}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
