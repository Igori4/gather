import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '',
  withCredentials: true,
})

// Silent refresh interceptor — retries once on 401
api.interceptors.response.use(
  res => res,
  async error => {
    const originalRequest = error.config
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      originalRequest._retry = true
      try {
        await api.post('/auth/refresh')
        return api(originalRequest)
      } catch {
        // Refresh failed — redirect to login
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        } else {
          return Promise.reject(error)
        }
      }
    }
    return Promise.reject(error)
  }
)
