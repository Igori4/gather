import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import RegisterPage from './RegisterPage'

let currentVariant = 'a'

const server = setupServer(
  http.get('*/api/experiments/register-cta/variant', () =>
    HttpResponse.json({ experimentName: 'register-cta', variant: currentVariant })
  ),
  http.post('*/api/events', () => HttpResponse.json({ ok: true }, { status: 201 }))
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

function renderRegisterPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('RegisterPage CTA A/B variant', () => {
  it('renders "Create Account" for variant a', async () => {
    currentVariant = 'a'
    renderRegisterPage()
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Create Account' })).toBeInTheDocument()
    )
  })

  it('renders "Get Started Free" for variant b', async () => {
    currentVariant = 'b'
    renderRegisterPage()
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Get Started Free' })).toBeInTheDocument()
    )
  })
})
