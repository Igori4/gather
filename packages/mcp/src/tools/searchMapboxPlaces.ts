import { z } from 'zod'
import type { MCPTool, ToolContext } from '../types'

const inputSchema = z.object({
  query: z.string().describe('Search query, e.g. "Italian restaurant Kyiv" or "rooftop bar"'),
  proximity: z.string().optional().describe('Lon,Lat for proximity bias, e.g. "30.5234,50.4501"'),
})

interface MapboxFeature {
  properties: {
    name: string
    full_address: string
    place_type?: string[]
  }
  geometry: {
    coordinates: [number, number]
  }
}

export const searchMapboxPlacesTool: MCPTool = {
  name: 'search_mapbox_places',
  description:
    'Search for real venues near a location using Mapbox Geocoding — use this to find specific place suggestions',
  inputSchema,
  async execute({ query, proximity }, { mapboxToken }: ToolContext) {
    const params = new URLSearchParams({
      q: query as string,
      access_token: mapboxToken,
      limit: '3',
      language: 'en',
      types: 'poi',
    })
    if (proximity) params.set('proximity', proximity as string)

    const url = `https://api.mapbox.com/search/geocode/v6/forward?${params.toString()}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Mapbox geocoding failed: ${res.status}`)

    const data = (await res.json()) as { features?: MapboxFeature[] }
    const features = data.features ?? []

    return {
      places: features.slice(0, 3).map(f => ({
        name: f.properties.name,
        address: f.properties.full_address,
        lat: f.geometry.coordinates[1],
        lng: f.geometry.coordinates[0],
      })),
    }
  },
}
