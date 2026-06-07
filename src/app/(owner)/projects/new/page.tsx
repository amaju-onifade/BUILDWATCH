import type { Metadata } from 'next'
import { ProjectCreateForm } from '@/modules/projects/components/ProjectCreateForm/ProjectCreateForm'

export const metadata: Metadata = {
  title: 'New Project — BuildWatch',
  description: 'Create a new construction project and configure your 12 milestone phases.',
}

export default function NewProjectPage() {
  return <ProjectCreateForm />
}
