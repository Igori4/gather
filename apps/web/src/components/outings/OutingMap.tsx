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
  const clickMarkerRef = useRef<mapboxgl.Marker | null>(null)
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
        if (markersRef.current.length === 0) {
          map.flyTo({ center: [coords.longitude, coords.latitude], zoom: 13, duration: 800 })
        }
      },
      () => { /* permission denied — keep default */ }
    )

    map.on('click', async (e) => {
      clickMarkerRef.current?.remove()
      clickMarkerRef.current = null

      const { lng, lat } = e.lngLat
      const geocodeToken = import.meta.env.VITE_MAPBOX_TOKEN
      let name = `${lat.toFixed(5)}, ${lng.toFixed(5)}`
      let address = ''

      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${geocodeToken}&types=poi,address&limit=1`
        const res = await fetch(url)
        if (res.ok) {
          const data = await res.json()
          const feature = data.features?.[0]
          if (feature) {
            const parts: string[] = feature.place_name.split(', ')
            name = parts[0]
            address = parts.slice(1).join(', ')
          }
        }
      } catch { /* use coordinate fallback */ }

      const popupNode = document.createElement('div')
      popupNode.innerHTML = `
        <p class="font-medium text-sm">${name}</p>
        ${address ? `<p class="text-xs text-gray-500 mb-1">${address}</p>` : ''}
        <button id="map-add-btn" class="mt-1 text-xs font-semibold text-blue-600 hover:underline">+ Add this place</button>
      `

      const popup = new mapboxgl.Popup({ offset: 14, closeButton: true })
        .setDOMContent(popupNode)

      popup.on('open', () => {
        document.getElementById('map-add-btn')?.addEventListener('click', () => {
          onSelectRef.current({
            placeId: `custom-${lng.toFixed(6)}-${lat.toFixed(6)}`,
            name,
            address: address || name,
            lat,
            lng,
          })
          clickMarkerRef.current?.remove()
          clickMarkerRef.current = null
        })
      })

      const el = createDot('#8b5cf6')
      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map)
      marker.togglePopup()
      clickMarkerRef.current = marker
    })

    return () => {
      markersRef.current.forEach(m => m.remove())
      markersRef.current = []
      clickMarkerRef.current?.remove()
      clickMarkerRef.current = null
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
