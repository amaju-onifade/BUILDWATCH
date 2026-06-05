import '@testing-library/jest-dom'
import { vi } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://mock')

vi.mock('@/lib/config', () => ({
  config: {
    databaseUrl: 'postgresql://mock',
    jwtSecret: 'mock-secret',
    flwClientId: 'mock-flw-id',
    flwClientSecret: 'mock-flw-secret',
    flwSecretHash: 'mock-flw-hash',
    deepseekApiKey: 'mock-deepseek-key',
    r2AccountId: 'mock-r2-id',
    r2AccessKeyId: 'mock-r2-access-key',
    r2SecretAccessKey: 'mock-r2-secret-key',
    r2BucketName: 'mock-r2-bucket',
    resendApiKey: 'mock-resend-key',
    appUrl: 'http://localhost:3000',
  }
}))
