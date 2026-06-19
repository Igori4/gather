import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { RegisterSchema, type RegisterInput } from '@gather/shared'
import axios from 'axios'
import { Eye, EyeOff } from 'lucide-react'
import { register } from '@/api/auth'
import { useAuthStore } from '@/stores/authStore'
import RegisterHero from '@/assets/auth/Register-hero.webp'
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

export default function RegisterPage() {
  const navigate = useNavigate()
  const setUser = useAuthStore(s => s.setUser)
  const setAccessToken = useAuthStore(s => s.setAccessToken)
  const [showPassword, setShowPassword] = useState(false)
  const [agreed, setAgreed] = useState(false)

  const form = useForm<RegisterInput>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: { name: '', email: '', password: '' },
  })

  const mutation = useMutation({ mutationFn: register })

  async function onSubmit(data: RegisterInput) {
    try {
      const result = await mutation.mutateAsync(data)
      setUser(result.user)
      setAccessToken(result.accessToken)
      navigate('/')
    } catch {
      // error displayed via mutation.error below
    }
  }

  const errorMessage =
    mutation.error && axios.isAxiosError(mutation.error)
      ? (mutation.error.response?.data?.message ?? 'Registration failed')
      : null

  return (
    <div className="flex flex-wrap justify-center gap-6 items-stretch max-w-4xl mx-auto overflow-hidden shadow-sm">
      <div
        className="relative flex-1 min-w-[280px] flex flex-col justify-end p-8 text-white rounded-lg"
        style={{
          backgroundImage: `linear-gradient(to top, rgba(0,0,0,0.7), rgba(0,0,0,0.2)), url(${RegisterHero})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <h2 className="text-3xl font-bold">Plan together, stay together.</h2>
        <p className="mt-2 text-sm text-white/90">
          Experience the warmth of effortless social coordination. From weekend brunches to grand
          reunions, Gather brings everyone closer.
        </p>
      </div>

      <Card className="flex-1 min-w-[320px] rounded-lg border-0 shadow-none p-8">
        <CardHeader className="mb-2">
          <CardTitle>Create your account</CardTitle>
          <CardDescription className="italic">
            &quot;The first step to your next great memory.&quot;
          </CardDescription>
        </CardHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4 mb-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Alex Johnson" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="alex@example.com" {...field} />
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
                    <p className="text-xs text-muted-foreground">
                      Must be at least 8 characters long.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

                <label className="flex items-start gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 accent-primary"
                    checked={agreed}
                    onChange={e => setAgreed(e.target.checked)}
                  />
                  I agree to the{' '}
                  <Link to="/terms" className="font-medium text-primary hover:underline">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link to="/privacy" className="font-medium text-primary hover:underline">
                    Privacy Policy
                  </Link>
                  .
                </label>

              {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
            </CardContent>

            <CardFooter className="flex flex-col gap-4">
              <Button
                type="submit"
                className="w-full"
                disabled={mutation.isPending || !agreed}
              >
                {mutation.isPending ? 'Creating account…' : 'Create Account'}
              </Button>

              <div className="flex w-full items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">OR JOIN WITH</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <div className="grid w-full grid-cols-2 gap-3">
                <Button type="button" variant="secondary">
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
                  Google
                </Button>
                <Button type="button" variant="secondary">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="#1877F2" aria-hidden="true">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  Facebook
                </Button>
              </div>

              <p className="text-sm text-muted-foreground text-center">
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Log in
                </Link>
              </p>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  )
}
