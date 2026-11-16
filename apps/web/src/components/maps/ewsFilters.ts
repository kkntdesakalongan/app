import type { EwsStation } from './useEwsStations'

export type EwsReadingFilter = keyof Pick<EwsStation['readings'], 'rainfallMm' | 'waterLevelMeters' | 'groundMovementCm'>
export type EwsRange = Partial<Record<'min' | 'max', number>>
export type EwsFilters = {
  stations?: { type: EwsStation['type']; statusCodes?: EwsStation['statusCode'][] }[]
  search?: string
} & Partial<Record<EwsReadingFilter, EwsRange>>
