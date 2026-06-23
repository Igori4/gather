import { useCallback, useState } from 'react'
import axios from 'axios'
import { Eye, EyeOff, Users } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { LoginSchema, type LoginInput } from '@gather/shared'
import { login } from '@/api/auth'
import { useAuthStore } from '@/stores/authStore'
import FriendsGathering from '@/assets/auth/Friends-gathering.webp'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'

export default function LoginPage() {
  const navigate = useNavigate()
  const setUser = useAuthStore(s => s.setUser)
  const setAccessToken = useAuthStore(s => s.setAccessToken)
  const [showPassword, setShowPassword] = useState(false)

  const form = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: '', password: '' },
  })

  const mutation = useMutation({ mutationFn: login })

  const onSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      const data = form.getValues()
      try {
        const result = await mutation.mutateAsync(data)
        setUser(result.user)
        setAccessToken(result.accessToken)
        navigate('/')
      } catch {
        // error displayed via mutation.error below
      }
    },
    [mutation, form, navigate, setUser, setAccessToken]
  )

  const errorMessage =
    mutation.error && axios.isAxiosError(mutation.error)
      ? (mutation.error.response?.data?.message ?? 'Login failed')
      : null

  return (
    <div className="flex flex-wrap justify-center gap-16 items-center h-full">
      <div className="flex flex-col gap-4 max-w-xl">
        <h1 className="text-4xl font-bold">
          Bring everyone <span className="text-primary">together</span> effortlessly.
        </h1>
        <p className="text-muted-foreground">
          Planning should be as enjoyable as the event itself. Log in to your space and start
          coordinating your next gathering.
        </p>
        <div className="relative">
          <img
            src={FriendsGathering}
            alt="Friends gathering"
            className="w-full h-full object-cover rounded-lg"
          />
          <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full bg-background/90 px-3 py-1.5 text-sm font-medium shadow">
            <Users className="h-4 w-4 text-primary" />
            5 friends attending dinner
          </div>
        </div>
      </div>
      <Card className="w-full max-w-md p-8">
        <CardHeader>
          <CardTitle>Welcome Back</CardTitle>
          <CardDescription>Please enter your details to sign in.</CardDescription>
        </CardHeader>

        <Form {...form}>
          <form onSubmit={onSubmit}>
            <CardContent className="space-y-4 mb-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email or Username</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="yourname@email.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Min. 8 characters"
                          className="pr-10"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(v => !v)}
                          className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="h-4 w-4 accent-primary" />
                  Remember me
                </label>
                <Link
                  to="/forgot-password"
                  className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>

              {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
            </CardContent>

            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={mutation.isPending}>
                {mutation.isPending ? 'Logging in…' : 'Log In'}
              </Button>

              <div className="flex w-full items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">OR</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <Button type="button" variant="secondary" className="w-full">
                <svg className="h-4 w-4" viewBox="0 0 48 48" aria-hidden="true">
                  <path
                    fill="#FFC107"
                    d="M43.6 20.5h-1.9V20.4H24v7.2h11.3c-1.6 4.5-5.9 7.7-11.3 7.7-6.9 0-12.5-5.6-12.5-12.5S17.1 10.3 24 10.3c3.2 0 6.1 1.2 8.3 3.2l5.4-5.4C34.4 4.9 29.5 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.2-.1-2.4-.4-3.5z"
                  />
                  <path
                    fill="#FF3D00"
                    d="M6.3 14.7l6.6 4.8C14.6 15.6 18.9 12.7 24 12.7c3.2 0 6.1 1.2 8.3 3.2l5.4-5.4C34.4 6.9 29.5 5 24 5c-7.4 0-13.7 4.1-17.1 10.1z"
                  />
                  <path
                    fill="#4CAF50"
                    d="M24 45c5.4 0 10.2-1.8 13.9-4.9l-6.4-5.4c-2 1.5-4.6 2.4-7.5 2.4-5.4 0-9.9-3.4-11.6-8.1l-6.5 5C9.9 40.6 16.4 45 24 45z"
                  />
                  <path
                    fill="#1976D2"
                    d="M43.6 20.5h-1.9V20.4H24v7.2h11.3c-.8 2.2-2.2 4.1-4.1 5.4l6.4 5.4C40.9 35.3 43.5 30.1 43.5 24c0-1.2-.1-2.4-.4-3.5z"
                  />
                </svg>
                Continue with Google
              </Button>

              <p className="text-sm text-muted-foreground text-center">
                Don&apos;t have an account?{' '}
                <Link
                  to="/register"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Sign up
                </Link>
              </p>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  )
}
