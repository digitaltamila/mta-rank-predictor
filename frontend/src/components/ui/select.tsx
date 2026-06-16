import { type SelectHTMLAttributes, forwardRef } from 'react'
import { cn } from '../../lib/utils'

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'h-12 w-full rounded-md border border-border bg-surface px-4 text-base text-foreground outline-none transition focus:border-navy focus:ring-2 focus:ring-navy/20 disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
)

Select.displayName = 'Select'
