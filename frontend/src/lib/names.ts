type Person = { first_name: string; last_name: string }

/** "Zosia Nowak" */
export function fullName(person: Person): string {
  return `${person.first_name} ${person.last_name}`
}

/** "Zosia N.": for narrow screens */
export function shortName(person: Person): string {
  return `${person.first_name} ${person.last_name.charAt(0)}.`
}
