export const statusCatalog = {
  active: { color: 'success', label: 'Aktif' },
  non_active: { color: 'neutral', label: 'Nonaktif' },
  expired: { color: 'error', label: 'Kadaluwarsa' },
  expiring_soon: { color: 'warning', label: 'Akan Kadaluwarsa' },
} as const

export const editableStatusCodes = ['active', 'non_active'] as const

export const activeCatalog = {
  true: { color: 'success', label: 'Aktif' },
  false: { color: 'error', label: 'Nonaktif' },
} as const
