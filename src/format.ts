export function formatCurrency(num: number | undefined | null, locale = 'ID', currency = 'IDR') {
  return num != null ? new Intl.NumberFormat(locale, { style: 'currency', currency }).format(num) : '-'
}

export function formatDate(date: string | undefined | null, options?: Intl.DateTimeFormatOptions, locale = 'id-ID') {
  return date ? new Date(date).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric', ...(options || {}) }) : '-'
}

export function formatTime(date: string | undefined | null, options?: Intl.DateTimeFormatOptions, locale = 'id-ID') {
  return date ? new Date(date).toLocaleTimeString(locale, { hour: 'numeric', minute: 'numeric', ...(options || {}) }) : '-'
}

export function formatDateTime(date: string | undefined | null, options?: Intl.DateTimeFormatOptions, locale = 'id-ID') {
  return date
    ? new Date(date).toLocaleString(locale, { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', ...(options || {}) })
    : '-'
}

export function formatMonth(date: string | undefined | null, options?: Intl.DateTimeFormatOptions, locale = 'id-ID') {
  return date ? new Date(date).toLocaleDateString(locale, { year: 'numeric', month: 'short', ...(options || {}) }) : '-'
}

export function formatNumber(num: number | undefined | null, locale = 'id-ID') {
  return num != null ? new Intl.NumberFormat(locale, { style: 'decimal', maximumFractionDigits: 2 }).format(num) : '-'
}

export function formatDelta(value: number) {
  const num = Number(value || 0)
  if (num > 0) return `+${num.toFixed(2)}%`
  return `${num.toFixed(2)}%`
}

export function formatHour(label: string) {
  const parts = String(label || '').split(' ')
  return parts.length > 1 ? parts[1] : parts[0] || '-'
}

export function formatLargeNumber(num: number | undefined | null, locale = 'id-ID') {
  if (num == null) return '-'

  const absNum = Math.abs(num)

  if (absNum >= 1e9) {
    return (
      new Intl.NumberFormat(locale, {
        style: 'decimal',
        maximumFractionDigits: 1,
      }).format(num / 1e9) + 'mil'
    )
  }

  if (absNum >= 1e6) {
    return (
      new Intl.NumberFormat(locale, {
        style: 'decimal',
        maximumFractionDigits: 1,
      }).format(num / 1e6) + 'jt'
    )
  }

  if (absNum >= 1e3) {
    return (
      new Intl.NumberFormat(locale, {
        style: 'decimal',
        maximumFractionDigits: 1,
      }).format(num / 1e3) + 'rb'
    )
  }

  return new Intl.NumberFormat(locale, { style: 'decimal' }).format(num)
}
