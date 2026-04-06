import * as RadixSeparator from '@radix-ui/react-separator'
import { forwardRef } from 'react'

export type SeparatorProps = RadixSeparator.SeparatorProps & {
  className?: string
}

export const Separator = forwardRef<HTMLDivElement, SeparatorProps>(
  ({ className, orientation = 'horizontal', decorative = true, ...props }, ref) => (
    <RadixSeparator.Root
      ref={ref}
      decorative={decorative}
      orientation={orientation}
      className={[
        'bg-border',
        orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
        className,
      ].filter(Boolean).join(' ')}
      {...props}
    />
  ),
)
Separator.displayName = 'Separator'
