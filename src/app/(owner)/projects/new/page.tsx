import type { Metadata } from 'next'
import ProjectSetup from '@/components/owner/ProjectSetup'

export const metadata: Metadata = {
  title: 'New Project Setup — BuildWatch',
  description: 'Configure your project details, milestones, budget, and team.',
}

export default function NewProjectPage() {
  return <ProjectSetup />
}
