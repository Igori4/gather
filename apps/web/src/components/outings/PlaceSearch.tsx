import { useState, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { AddPlaceInput } from '@gather/shared'

interface MapboxFeature {
  id: string
  place_name: string
  text: string
  center: [number, number]
}

interface MapboxGeocodingResponse {
  features: MapboxFeature[]
}

interface PlaceSearchProps {
  onSelect: (place: AddPlaceInput) => void
  disabled?: boolean
}

export function PlaceSearch({ onSelect, disabled }: PlaceSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<MapboxFeature[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleChange(value: string) {
    setQuery(value)
    setError(null)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!value.trim()) {
      setResults([])
      return
    }

    debounceRef.current = setTimeout(async () => {
      const token = import.meta.env.VITE_MAPBOX_TOKEN
      if (!token) {
        setError('Mapbox token not configured')
        return
      }
      setLoading(true)
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(value)}.json?access_token=${token}&types=poi,address&limit=5`
        const res = await fetch(url)
        if (!res.ok) throw new Error('Geocoding request failed')
        const data: MapboxGeocodingResponse = await res.json()
        setResults(data.features)
      } catch {
        setError('Search failed. Try again.')
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 350)
  }

  function handleSelect(feature: MapboxFeature) {
    const [lng, lat] = feature.center
    const parts = feature.place_name.split(', ')
    const name = parts[0]
    const address = parts.slice(1).join(', ') || feature.place_name

    onSelect({
      placeId: feature.id,
      name,
      address,
      lat,
      lng,
      mapboxUrl: `https://www.mapbox.com/maps/places/?query=${encodeURIComponent(feature.place_name)}`,
    })
    setQuery('')
    setResults([])
  }

  return (
    <div className="relative">
      <div className="flex gap-2">
        <Input
          placeholder="Search for a place…"
          value={query}
          onChange={e => handleChange(e.target.value)}
          disabled={disabled}
        />
        {loading && (
          <span className="self-center text-sm text-muted-foreground">Searching…</span>
        )}
      </div>

      {error && <p className="mt-1 text-sm text-destructive">{error}</p>}

      {results.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full rounded-md border bg-background shadow-md">
          {results.map(feature => (
            <li key={feature.id}>
              <Button
                variant="ghost"
                className="w-full justify-start px-3 py-2 h-auto text-left"
                onClick={() => handleSelect(feature)}
                disabled={disabled}
              >
                <div>
                  <p className="text-sm font-medium">{feature.text}</p>
                  <p className="text-xs text-muted-foreground truncate">{feature.place_name}</p>
                </div>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
