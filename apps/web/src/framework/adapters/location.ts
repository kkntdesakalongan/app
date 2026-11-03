import { z } from 'zod'
import services from '@/utils/services'

import type { LocationOperations } from '@southneuhof/loom'

export const locationOperations: LocationOperations = {
  async detail({ id, signal, mapProvider }) {
    if (mapProvider === 'openstreetmap') {
      const [lat, lng] = z.tuple([z.number(), z.number()]).parse(JSON.parse(id))
      return { lat, lng }
    }
    const { result } = await services.get('google-map/detail-place', { place_id: id, fields: ['geometry', 'formatted_address'] }, { init: { signal } })
    return {
      lat: result.geometry.location.lat,
      lng: result.geometry.location.lng,
      formatted_address: result.formatted_address,
    }
  },

  async autocomplete({ input, signal, mapProvider }) {
    if (mapProvider === 'openstreetmap') {
      const key = import.meta.env.VITE_GEOAPIFY_API_KEY
      if (!key) throw new Error('VITE_GEOAPIFY_API_KEY is required.')
      const url = new URL('https://api.geoapify.com/v1/geocode/autocomplete')
      url.search = new URLSearchParams({ text: input, apiKey: key, format: 'json' }).toString()
      const response = await fetch(url, { signal })
      if (!response.ok) throw new Error('Location search failed.')
      const data = z
        .object({
          results: z.array(
            z.object({
              lat: z.number(),
              lon: z.number(),
              formatted: z.string(),
              address_line1: z.string().optional(),
              address_line2: z.string().optional(),
            })
          ),
        })
        .parse(await response.json())
      return data.results.map((item) => ({
        id: JSON.stringify([item.lat, item.lon]),
        primaryText: item.address_line1 ?? item.formatted,
        secondaryText: item.address_line2,
      }))
    }
    const { predictions } = await services.get('google-map/place-autocomplete', { input }, { init: { signal } })
    return predictions.map((prediction: any) => ({
      id: String(prediction.place_id),
      primaryText: String(prediction.structured_formatting?.main_text ?? prediction.description ?? ''),
      secondaryText: prediction.structured_formatting?.secondary_text,
    }))
  },

  async mapConfig({ signal, mapProvider }) {
    if (mapProvider === 'openstreetmap') {
      const apiKey = import.meta.env.VITE_GEOAPIFY_API_KEY
      if (!apiKey) throw new Error('VITE_GEOAPIFY_API_KEY is required.')
      return { apiKey }
    }
    const { data } = await services.get('configs', undefined, { init: { signal } })
    return { apiKey: data.gmaps.web }
  },
}
