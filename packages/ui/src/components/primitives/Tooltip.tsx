import * as RadixTooltip from '@radix-ui/react-tooltip'
import { type ReactNode, forwardRef } from 'react'

export const TooltipProvider = RadixTooltip.Provider
export const TooltipRoot = RadixTooltip.Root
export const TooltipTrigger = RadixTooltip.Trigger

export type TooltipContentProps = RadixTooltip.TooltipContentProps

export const TooltipContent = forwardRef<HTMLDivElement, TooltipContentProps>(
  ({ className, sideOffset = 4, children, ...props }, ref) => (
    <RadixTooltip.Portal>
      <RadixTooltip.Content
        ref={ref}
        sideOffset={sideOffset}
        className={[
          'z-50 overflow-hidden rounded-md bg-text-primary px-2 py-1 text-xs text-panel',
          'animate-in fade-in-0 zoom-in-95',
          'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
          'data-[side=bottom]:slide-in-from-top-1 data-[side=top]:slide-in-from-bottom-1',
          'data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1',
          className,
        ].filter(Boolean).join(' ')}
        {...props}
      >
        {children}
      </RadixTooltip.Content>
    </RadixTooltip.Portal>
  ),
)
TooltipContent.displayName = 'TooltipContent'

export type TooltipProps = {
  content: ReactNode
  children: ReactNode
  side?: RadixTooltip.TooltipContentProps['side']
  delayDuration?: number
}

export function Tooltip({ content, children, side = 'top', delayDuration = 400 }: TooltipProps) {
  return (
    <TooltipRoot delayDuration={delayDuration}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side}>{content}</TooltipContent>
    </TooltipRoot>
  )
}
