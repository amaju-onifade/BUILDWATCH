import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { z } from 'zod'

const InspectorSchema = z.object({
  name: z.string().min(2),
  registrationNumber: z.string().optional(),
  location: z.string().min(2),
})

export async function POST(req: NextRequest) {
  const session = await requireRole(req, ['owner'])
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { name, registrationNumber, location } = InspectorSchema.parse(body)

    await prisma.inspectors.create({
      data: {
        name,
        registrationNumber,
        location,
      },
    })

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to register', details: error }, { status: 400 })
  }
}
