import { FLW_CONFIG, getFlutterwaveToken } from '@/lib/flutterwave'

export async function verifyFlutterwaveTransaction(chargeId: string) {
  const token = await getFlutterwaveToken()
  const res = await fetch(`${FLW_CONFIG.baseUrl}/charges/${chargeId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  
  if (!res.ok) {
    throw new Error(`Transaction verification failed: ${res.status}`)
  }
  
  return res.json()
}
