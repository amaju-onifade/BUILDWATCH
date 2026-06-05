function requireVar(name: string, fallback?: string): string {
  const value = process.env[name] || fallback
  if (!value) {
    throw new Error(
      `[config] Missing required environment variable: ${name}. Check .env.local (development) or Vercel project settings (production).`
    )
  }
  return value
}

const isTest = process.env.NODE_ENV === 'test'

export const config = {
  // Database
  databaseUrl:        requireVar('DATABASE_URL', isTest ? 'postgresql://mock' : undefined),

  // Auth
  jwtSecret:          requireVar('JWT_SECRET', isTest ? 'mock-secret' : undefined),

  // Flutterwave
  flwClientId:        requireVar('FLW_CLIENT_ID', isTest ? 'mock' : undefined),
  flwClientSecret:    requireVar('FLW_CLIENT_SECRET', isTest ? 'mock' : undefined),
  flwSecretHash:      requireVar('FLW_SECRET_HASH', isTest ? 'mock' : undefined),

  // DeepSeek
  deepseekApiKey:     requireVar('DEEPSEEK_API_KEY', isTest ? 'mock' : undefined),

  // Cloudflare R2
  r2AccountId:        requireVar('R2_ACCOUNT_ID', isTest ? 'mock' : undefined),
  r2AccessKeyId:      requireVar('R2_ACCESS_KEY_ID', isTest ? 'mock' : undefined),
  r2SecretAccessKey:  requireVar('R2_SECRET_ACCESS_KEY', isTest ? 'mock' : undefined),
  r2BucketName:       requireVar('R2_BUCKET_NAME', isTest ? 'mock' : undefined),

  // Email
  resendApiKey:       requireVar('RESEND_API_KEY', isTest ? 'mock' : undefined),

  // App
  appUrl:             requireVar('NEXT_PUBLIC_APP_URL', isTest ? 'http://localhost:3000' : undefined),

  // Cron
  cronSecret:         requireVar('CRON_SECRET', isTest ? 'mock-cron-secret' : undefined),
} as const
