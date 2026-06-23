import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import App from './App'
import { api } from './lib/axios'
import { useAuthStore } from './stores/authStore'
import { FeatureFlagProvider, FEATURE_FLAGS_QUERY_KEY, fetchFlags } from './lib/flags'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
    },
  },
})

async function bootstrap() {
  const { setUser, setAccessToken, setInitialized } = useAuthStore.getState()
  const authRefresh = api
    .post('/auth/refresh')
    .then(({ data }) => {
      setUser(data.user)
      setAccessToken(data.accessToken)
    })
    .catch(() => {
      // No valid refresh token — user stays unauthenticated
    })
  const flagsPrefetch = queryClient.prefetchQuery({
    queryKey: FEATURE_FLAGS_QUERY_KEY,
    queryFn: fetchFlags,
    staleTime: Infinity,
  })

  await Promise.all([authRefresh, flagsPrefetch])
  setInitialized()
}

bootstrap().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <FeatureFlagProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </FeatureFlagProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </StrictMode>
  )
})
