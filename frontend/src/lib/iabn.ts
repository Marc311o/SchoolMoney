/** "PL61109010140000071219812874" -> "PL61 1090 1014 0000 0712 1981 2874" */
export function formatIban(iban: string): string {
  return iban.replace(/\s/g, '').replace(/(.{4})(?=.)/g, '$1 ')
}

/** "PL61 … 2874": enough to tell accounts apart in a list or a select */
export function shortIban(iban: string): string {
  const compact = iban.replace(/\s/g, '')
  return `${compact.slice(0, 4)} … ${compact.slice(-4)}`
}
