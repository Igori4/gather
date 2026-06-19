import { TrackEvent } from '@gather/shared'
import { api } from './axios'

function track(event: TrackEvent): void {
  // Fire-and-forget — analytics must never block or break the UI.
  void api.post('/api/events', event).catch(() => {})
}

// Call once, when the variant is actually visible to the user (e.g. inside
// an IntersectionObserver callback or after the element mounts in view) —
// not blindly on component mount, since a component can mount off-screen.
export function trackExposure(experimentName: string, variant: string): void {
  track({ type: 'experiment_exposed', experimentName, variant })
}

export function trackConversion(
  experimentName: string,
  variant: string,
  payload?: Record<string, unknown>
): void {
  track({ type: 'experiment_converted', experimentName, variant, payload })
}
