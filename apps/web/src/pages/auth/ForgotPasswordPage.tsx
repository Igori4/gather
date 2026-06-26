import axios from 'axios'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { ForgotPasswordSchema, type ForgotPasswordInput } from '@gather/shared'
import { ArrowRight, ChevronLeft, KeyRound, MailCheck, ShieldCheck } from 'lucide-react'
import { forgotPassword } from '@/api/auth'
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

export default function ForgotPasswordPage() {
  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(ForgotPasswordSchema),
    defaultValues: { email: '' },
  })

  const mutation = useMutation({ mutationFn: forgotPassword })

  function onSubmit(data: ForgotPasswordInput) {
    mutation.mutate(data)
  }

  const errorMessage =
    mutation.error && axios.isAxiosError(mutation.error)
      ? (mutation.error.response?.data?.message ?? 'Something went wrong')
      : null

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4">
      <Card className="p-8 text-center">
        {mutation.isSuccess ? (
          <>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
              <MailCheck className="h-6 w-6 text-secondary-foreground" />
            </div>
            <CardHeader className='mb-6'>
              <CardTitle>Check your email</CardTitle>
              <CardDescription>
                If that address is registered, a secure reset link is on its way.
              </CardDescription>
            </CardHeader>
            <CardFooter className="flex-col">
              <Link
                to="/login"
                className="flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                <ChevronLeft className="h-4 w-4" />
                Back to Login
              </Link>
            </CardFooter>
          </>
        ) : (
          <>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
              <KeyRound className="h-6 w-6 text-secondary-foreground" />
            </div>
            <CardHeader className="mb-6">
              <CardTitle>Forgot password?</CardTitle>
              <CardDescription>
                No worries, it happens to the best of us. Enter your email and we&apos;ll send
                you a secure link to reset it.
              </CardDescription>
            </CardHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <CardContent className="space-y-4 text-left mb-6">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="name@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
                </CardContent>

                <CardFooter className="flex flex-col gap-4">
                  <Button type="submit" className="w-full rounded-full" disabled={mutation.isPending}>
                    {mutation.isPending ? 'Sending…' : 'Send Recovery Link'}
                    <ArrowRight className="h-4 w-4" />
                  </Button>

                  <div className="h-px w-full bg-border" />

                  <Link
                    to="/login"
                    className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Back to Login
                  </Link>
                </CardFooter>
              </form>
            </Form>
          </>
        )}
      </Card>

      <div className="flex items-start gap-3 rounded-lg bg-card p-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent">
          <ShieldCheck className="h-4 w-4 text-accent-foreground" />
        </div>
        <div className="text-left">
          <p className="text-sm font-medium">Secure Coordination</p>
          <p className="text-xs text-muted-foreground">
            Your account recovery is encrypted and private, ensuring your group plans stay safe.
          </p>
        </div>
      </div>
    </div>
  )
}
