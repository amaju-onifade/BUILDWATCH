import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.DATABASE_URL': '"postgresql://mock"',
    'process.env.JWT_SECRET': '"mock"',
    'process.env.FLW_CLIENT_ID': '"mock"',
    'process.env.FLW_CLIENT_SECRET': '"mock"',
    'process.env.FLW_SECRET_HASH': '"mock"',
    'process.env.DEEPSEEK_API_KEY': '"mock"',
    'process.env.R2_ACCOUNT_ID': '"mock"',
    'process.env.R2_ACCESS_KEY_ID': '"mock"',
    'process.env.R2_SECRET_ACCESS_KEY': '"mock"',
    'process.env.R2_BUCKET_NAME': '"mock"',
    'process.env.RESEND_API_KEY': '"mock"',
    'process.env.NEXT_PUBLIC_APP_URL': '"http://localhost:3000"',
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      thresholds: {
        statements: 70,
        branches: 65,
        functions: 70,
        lines: 70,
      },
      exclude: [
        'src/test/**',
        'src/**/*.test.*',
        'src/app/**',          // thin shells — tested via handler tests
        'prisma/**',
        'tokens/**',
        'public/**',
      ],
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
