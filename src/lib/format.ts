export function formatCurrency(value: number | null | undefined, currency: string = 'NGN'): string {
  if (value == null) return '\u2014'
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}
