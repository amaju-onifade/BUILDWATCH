import { NextRequest } from 'next/server'
import { handleDownloadDossier } from '@/modules/audit-trail/api/downloadDossier'

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  // Await params as per Next.js 15+ rules for dynamic segments
  const resolvedParams = await context.params
  return handleDownloadDossier(req, { params: resolvedParams })
}
