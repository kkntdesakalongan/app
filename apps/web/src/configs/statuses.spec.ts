import { describe, expect, it } from 'vitest'
import { editableStatusCodes, statusCatalog } from './statuses'
import { appInputPresets } from './input-presets'
import { appDisplayPresets } from './display-presets'
import { appInputProps } from '@/framework/inputs/registry'

describe('status catalog', () => {
  it('keeps editable choices within the full display catalog', () => {
    const options = appInputProps.resolve('radio', { props: appInputPresets.statusCode.props }).data

    expect(editableStatusCodes).toEqual(['active', 'non_active'])
    expect(options).toEqual([
      { id: 'active', name: 'Aktif' },
      { id: 'non_active', name: 'Nonaktif' },
    ])
    expect(Object.keys(statusCatalog)).toEqual(['active', 'non_active', 'expired', 'expiring_soon'])
    expect(appDisplayPresets.statusCode.props.options.expired).toEqual({ color: 'error', label: 'Kadaluwarsa' })
  })
})
