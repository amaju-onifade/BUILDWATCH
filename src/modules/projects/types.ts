import { z } from 'zod'

// Google Maps pin URL or short-link pattern
const googleMapsUrlPattern = /^https?:\/\/(maps\.google\.|goo\.gl\/maps|maps\.app\.goo\.gl|www\.google\.com\/maps)/

export const CreateProjectSchema = z.object({
  name: z.string().min(2, "Project name must be at least 2 characters").max(200),
  // Structured address fields
  streetNumber: z.string().min(1, "Street number is required"),
  streetName: z.string().min(2, "Street name is required"),
  lga: z.string().min(2, "Local Government Area is required"),
  state: z.string().min(2, "State is required"),
  // Optional Google Maps pin for GPS anchor verification
  googleMapsPin: z
    .string()
    .regex(googleMapsUrlPattern, "Must be a valid Google Maps URL (maps.google.com, goo.gl/maps, etc.)")
    .optional()
    .or(z.literal('')),
  // Derived from address for backward-compat and display
  location: z.string().optional(),
  buildType: z.string().optional(),
  totalBudget: z.number().min(0).optional(),
  currency: z.string().default('NGN'),
})

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>
