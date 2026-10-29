import { describe, expect, it } from 'vitest'
import { appInputPresets } from './input-presets'

describe('status catalog', () => {
  it('limits editable choices to active and non-active statuses', () => {
    const options = appInputPresets.statusCode.props.data

    expect(options.map(({ id }) => id)).toEqual(['active', 'non_active'])
  })
})
