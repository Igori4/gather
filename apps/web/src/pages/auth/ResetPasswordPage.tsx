import axios from 'axios'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { ResetPasswordSchema, type ResetPasswordInput } from '@gather/shared'
import { resetPassword } from '@/api/auth'
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

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(ResetPasswordSchema),
    defaultValues: { token, password: '' },
  })

  const mutation = useMutation({ mutationFn: resetPassword })

  async function onSubmit(data: ResetPasswordInput) {
    try {
      await mutation.mutateAsync(data)
      navigate('/login')
    } catch {
      // error displayed via mutation.error below
    }
  }

  const errorMessage =
    mutation.error && axios.isAxiosError(mutation.error)
      ? (mutation.error.response?.data?.message ?? 'Password reset failed')
      : null

  if (!token) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invalid link</CardTitle>
          <CardDescription>
            This reset link is missing a token. Please request a new one.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Link
            to="/forgot-password"
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Request new link
          </Link>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Set a new password</CardTitle>
        <CardDescription>Must be at least 8 characters</CardDescription>
      </CardHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Min. 8 characters" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
          </CardContent>

          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving…' : 'Set new password'}
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              <Link
                to="/login"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Back to sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Form>
    </Card>
  )
}
