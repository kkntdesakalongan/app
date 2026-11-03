export const titleCase = (s: string) => s.replace(/^[-_]*(.)/, (_: any, c: any) => c.toUpperCase()).replace(/[-_]+(.)/g, (_: any, c: any) => ' ' + c.toUpperCase())

export function truncate(str: string, n: number) {
  return str.length > n ? str.slice(0, n - 1) + '\u2026' : str
}

export function parseCode(text: string) {
  if (!text) return ''
  return text
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_\s]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
}
