import * as React from 'react'

import { cn } from '../../features/shared/utils'

function Alert({ className, variant = 'default', ...props }: React.ComponentProps<'div'> & { variant?: 'default' | 'destructive' }) {
  return (
    <div
      role="alert"
      data-slot="alert"
      data-variant={variant}
      className={cn(
        'relative w-full rounded-lg border px-4 py-3 text-sm grid gap-1',
        variant === 'destructive' && 'border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive',
        className
      )}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="alert-title" className={cn('font-medium tracking-tight', className)} {...props} />
}

function AlertDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="alert-description" className={cn('text-sm opacity-90', className)} {...props} />
}

export { Alert, AlertDescription, AlertTitle }