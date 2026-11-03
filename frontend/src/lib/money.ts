const PLN = new Intl.NumberFormat('en-GB', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** "1234.5" -> "1,234.50" (the API sends money as a string; this is display only) */
export function formatMoney(amount: string): string {
  return PLN.format(Number(amount))
}

/**
 * What the user typed -> what the API expects, or null when it is not money.
 * Accepts "12", "12.5", "12,50" and spaces: "1 234,5" -> "1234.50".
 */
export function parseMoneyInput(input: string): string | null {
  const normalized = input.replace(/\s/g, '').replace(',', '.')
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null
  const [whole, fraction = ''] = normalized.split('.')
  return `${whole.replace(/^0+(?=\d)/, '')}.${fraction.padEnd(2, '0')}`
}
