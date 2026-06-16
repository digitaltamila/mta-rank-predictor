import { type InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '../../lib/utils'

export type InputProps = InputHTMLAttributes<HTMLInputElement>

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-12 w-full rounded-md border border-border bg-surface px-4 text-base text-foreground outline-none transition placeholder:text-muted-foreground focus:border-navy focus:ring-2 focus:ring-navy/20 disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      {...props}
    />
  ),
)

Input.displayName = 'Input'
