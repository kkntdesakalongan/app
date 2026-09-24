import { formatCurrency, formatDate, formatDateTime, formatDelta, formatHour, formatLargeNumber, formatMonth, formatNumber, formatTime } from './format'

export type Formatter = (value: any) => any

export interface ParserConfig {
  dictionary?: Record<string, Record<string, string>>
  formatters?: Record<string, Formatter>
}

const defaultFormatters: Record<string, Formatter> = {
  number: formatNumber,
  largeNumber: formatLargeNumber,
  currency: formatCurrency,
  month: formatMonth,
  date: formatDate,
  time: formatTime,
  datetime: formatDateTime,
  hour: formatHour,
  delta: formatDelta,
}

let parserConfig: Required<ParserConfig> = {
  dictionary: {},
  formatters: { ...defaultFormatters },
}

export function configureParser(options: ParserConfig) {
  parserConfig = {
    dictionary: { ...parserConfig.dictionary, ...(options.dictionary || {}) },
    formatters: { ...parserConfig.formatters, ...(options.formatters || {}) },
  }
}

export function resetParserConfigForTests() {
  parserConfig = {
    dictionary: {},
    formatters: { ...defaultFormatters },
  }
}

export function hasFormatter(key: string): boolean {
  return Object.hasOwn(parserConfig.formatters, key)
}

export function parse(key: string, value: any): any {
  if (!parserConfig.formatters[key]) return parserConfig.dictionary[key]?.[value] || value
  return parserConfig.formatters[key](value)
}
