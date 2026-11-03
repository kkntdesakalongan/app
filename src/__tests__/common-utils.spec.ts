import { describe, expect, it } from 'vitest'
import { formatLargeNumber } from '../format'
import { dataURItoBlob, indexCompare } from '../object'
import { parseCode, titleCase } from '../string'

describe('common framework utilities', () => {
  it('converts kebab and snake labels to title case', () => {
    expect(titleCase('user-profile')).toBe('User Profile')
    expect(titleCase('user_profile')).toBe('User Profile')
  })

  it('normalizes text into underscore codes', () => {
    expect(parseCode(' Déjà Vu! 2026 ')).toBe('deja_vu_2026')
  })

  it('formats large numbers with Indonesian suffixes', () => {
    expect(formatLargeNumber(null)).toBe('-')
    expect(formatLargeNumber(999)).toBe('999')
    expect(formatLargeNumber(1_200)).toBe('1,2rb')
    expect(formatLargeNumber(1_200_000)).toBe('1,2jt')
    expect(formatLargeNumber(1_200_000_000)).toBe('1,2mil')
  })

  it('compares values by index with all supported modes', () => {
    const values = ['draft', 'review', 'approved']

    expect(indexCompare('moreThan', values, 'approved', 'review')).toBe(true)
    expect(indexCompare('lessThan', values, 'draft', 'review')).toBe(true)
    expect(indexCompare('moreThanOrEqual', values, 'review', 'review')).toBe(true)
    expect(indexCompare('lessThanOrEqual', values, 'review', 'review')).toBe(true)
  })

  it('converts data URIs to blobs', () => {
    const blob = dataURItoBlob('data:text/plain;base64,aGVsbG8=')

    expect(blob.type).toBe('text/plain')
    expect(blob.size).toBe(5)
  })
})
