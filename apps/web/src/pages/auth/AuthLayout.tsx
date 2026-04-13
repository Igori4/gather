import React from 'react'

export function AuthLayout({ children }: { children: React.ReactNode }): React.ReactNode {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Gather</h1>
          <p className="text-muted-foreground mt-1">Plan outings together</p>
        </div>
        {children}
      </div>
    </div>
  )
}
