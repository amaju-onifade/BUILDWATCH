import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export type PageUser = {
  userId: string
  fullName: string
  initials: string
  plan: string
}

export async function requirePageUser(): Promise<PageUser> {
  const session = await getSession()
  if (!session) redirect('/login')

  const user = await prisma.users.findUnique({
    where: { id: session.userId },
    select: { fullName: true },
  })

  if (!user) redirect('/login')

  const name = user.fullName
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return { userId: session.userId, fullName: name, initials, plan: 'Standard Plan' }
}
