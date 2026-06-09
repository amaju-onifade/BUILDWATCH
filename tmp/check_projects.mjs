import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
const u = await p.users.findUnique({ where: { id: 'cmq0691wb00006sv1703f295s' }, select: { email: true, fullName: true } })
const count = await p.projects.count({ where: { ownerId: 'cmq0691wb00006sv1703f295s' } })
const projects = await p.projects.findMany({ where: { ownerId: 'cmq0691wb00006sv1703f295s' }, select: { id: true, name: true } })
console.log('User:', u)
console.log('Project count:', count)
console.log('Projects:', JSON.stringify(projects))
await p.$disconnect()
