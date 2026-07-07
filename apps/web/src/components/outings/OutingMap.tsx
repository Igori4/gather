import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import type { AddPlaceInput } from '@gather/shared'
import type { OutingPlace } from '@/api/outings'
import type { MapboxFeature } from './PlaceSearch'

interface OutingMapProps {
  places: OutingPlace[]
  searchResults: MapboxFeature[]
  onSelect: (place: AddPlaceInput) => void
}

export function OutingMap({ places, searchResults, onSelect }: OutingMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])
  const onSelectRef = useRef(onSelect)

  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])

  useEffect(() => {
    const token = import.meta.env.VITE_MAPBOX_TOKEN
    if (!token || !containerRef.current) return

    mapboxgl.accessToken = token
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [30.52, 50.45],
      zoom: 11,
    })
    map.addControl(new mapboxgl.NavigationControl(), 'top-right')
    mapRef.current = map

    navigator.geolocation?.getCurrentPosition(
      ({ coords }) => {
        // only fly to user if no places/results have already moved the map
        if (markersRef.current.length === 0) {
          map.flyTo({ center: [coords.longitude, coords.latitude], zoom: 13, duration: 800 })
        }
      },
      () => { /* permission denied — keep default */ }
    )

    return () => {
      markersRef.current.forEach(m => m.remove())
      markersRef.current = []
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    const bounds = new mapboxgl.LngLatBounds()
    let hasPoints = false

    for (const place of places) {
      const el = createDot('#3b82f6')
      const popup = new mapboxgl.Popup({ offset: 12, closeButton: false }).setHTML(
        `<p class="font-medium text-sm">${place.name}</p><p class="text-xs text-gray-500">${place.address}</p>`
      )
      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([place.lng, place.lat])
        .setPopup(popup)
        .addTo(map)
      markersRef.current.push(marker)
      bounds.extend([place.lng, place.lat])
      hasPoints = true
    }

    for (const feature of searchResults) {
      const [lng, lat] = feature.center
      const el = createDot('#f97316')
      el.title = feature.text
      el.addEventListener('click', () => {
        const parts = feature.place_name.split(', ')
        const name = parts[0]
        const address = parts.slice(1).join(', ') || feature.place_name
        onSelectRef.current({ placeId: feature.id, name, address, lat, lng })
      })
      const popup = new mapboxgl.Popup({ offset: 12, closeButton: false }).setText(
        `${feature.text} — click to add`
      )
      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map)
      markersRef.current.push(marker)
      bounds.extend([lng, lat])
      hasPoints = true
    }

    if (hasPoints && !bounds.isEmpty()) {
      map.fitBounds(bounds, { padding: 60, maxZoom: 15, duration: 400 })
    }
  }, [places, searchResults])

  return <div ref={containerRef} className="w-full h-52 rounded-md overflow-hidden border mt-3" />
}

function createDot(color: string): HTMLDivElement {
  const el = document.createElement('div')
  el.style.cssText = `
    width: 14px; height: 14px;
    border-radius: 50%;
    background: ${color};
    border: 2px solid white;
    box-shadow: 0 1px 4px rgba(0,0,0,0.4);
    cursor: pointer;
  `
  return el
}
