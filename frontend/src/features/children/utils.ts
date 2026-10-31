function parseDate(isoDate: string) {
  const [year, month, day] = isoDate.split('-').map(Number)
  return { year, month, day }
}

export function ageInYears(birthDate: string, today = new Date()): number {
  const { year, month, day } = parseDate(birthDate)
  const hadBirthday =
    today.getMonth() + 1 > month ||
    (today.getMonth() + 1 === month && today.getDate() >= day)
  return today.getFullYear() - year - (hadBirthday ? 0 : 1)
}

export function formatBirthDate(birthDate: string): string {
  const { year, month, day } = parseDate(birthDate)
  return new Date(year, month - 1, day).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
