import { z } from 'zod'

export const CreateProjectSchema = z.object({
  name: z.string().min(2, "Project name must be at least 2 characters").max(200),
  location: z.string().min(2, "Location must be at least 2 characters"),
  buildType: z.string().optional(),
  totalBudget: z.number().min(0).optional(),
  currency: z.string().default('NGN'),
})

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>
