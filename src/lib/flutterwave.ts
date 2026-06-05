import { config as appConfig } from './config'

const isProd = process.env.NODE_ENV === 'production'

export const FLW_CONFIG = {
  baseUrl: isProd
    ? 'https://f4bexperience.flutterwave.com'
    : 'https://developersandbox-api.flutterwave.com',
  tokenUrl: 'https://idp.flutterwave.com/realms/flutterwave/protocol/openid-connect/token',
  clientId: appConfig.flwClientId,
  clientSecret: appConfig.flwClientSecret,
  secretHash: appConfig.flwSecretHash,
}

interface TokenCache {
  accessToken: string
  expiresAt: number // epoch ms
}

let cache: TokenCache | null = null

async function fetchNewToken(): Promise<TokenCache> {
  const res = await fetch(FLW_CONFIG.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: FLW_CONFIG.clientId,
      client_secret: FLW_CONFIG.clientSecret,
      grant_type: 'client_credentials',
    }),
  })

  if (!res.ok) {
    throw new Error(`Flutterwave token fetch failed: ${res.status}`)
  }

  const data = await res.json()
  return {
    accessToken: data.access_token,
    // Subtract 60s buffer to refresh before actual expiry
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  }
}

export async function getFlutterwaveToken(): Promise<string> {
  if (!cache || Date.now() >= cache.expiresAt) {
    cache = await fetchNewToken()
  }
  return cache.accessToken
}
