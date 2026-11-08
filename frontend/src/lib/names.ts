type Person = { first_name: string; last_name: string }

/** "Zosia Nowak" */
export function fullName(person: Person): string {
  return `${person.first_name} ${person.last_name}`
}

/** "Zosia N.": for narrow screens */
export function shortName(person: Person): string {
  return `${person.first_name} ${person.last_name.charAt(0)}.`
}

/** "ZN" for "Zosia Nowak": two letters for an avatar */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}
