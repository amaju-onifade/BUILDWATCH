import { z } from 'zod'

export const RegisterOwnerSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

export type RegisterOwnerInput = z.infer<typeof RegisterOwnerSchema>

export const LoginOwnerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
})

export type LoginOwnerInput = z.infer<typeof LoginOwnerSchema>

export const RedeemInviteSchema = z.object({
  token: z.string().min(1, "Token is required"),
  fullName: z.string().min(2, "Full name must be at least 2 characters").max(100),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

export type RedeemInviteInput = z.infer<typeof RedeemInviteSchema>
