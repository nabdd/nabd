/** "Rami Haddad" -> "Rami H." Hospitals see this until a donor confirms. */
export function shortName(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length < 2) return parts[0] ?? ''
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`
}

/** "+96170123456" -> "+961 70 ••• 456" */
export function maskPhone(phone: string) {
  const m = /^\+(961)(\d{7,8})$/.exec(phone)
  if (!m) return '••••'
  const rest = m[2]
  const head = rest.length - 5
  return `+${m[1]} ${rest.slice(0, head)} ••• ${rest.slice(-3)}`
}

/** Normalises Lebanese numbers to E.164 (+961...). Returns null when the number is not valid. */
export function normalizeLebanesePhone(input: string): string | null {
  let d = input.replace(/[^\d]/g, '')
  if (d.startsWith('00')) d = d.slice(2)
  if (d.startsWith('961')) d = d.slice(3)
  if (d.startsWith('0')) d = d.slice(1)
  if (!/^\d{7,8}$/.test(d)) return null
  return `+961${d}`
}
