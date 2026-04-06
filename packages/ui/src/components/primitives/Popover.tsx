import * as RadixPopover from '@radix-ui/react-popover'
import { type ReactNode, forwardRef } from 'react'

export const PopoverRoot = RadixPopover.Root
export const PopoverTrigger = RadixPopover.Trigger
export const PopoverClose = RadixPopover.Close
export const PopoverAnchor = RadixPopover.Anchor

const widthClasses = {
  fit: 'w-fit',
  sm: 'w-48',
  md: 'w-64',
  lg: 'w-80',
  xl: 'w-96',
  trigger: 'w-[var(--radix-popover-trigger-width)]',
}

export type PopoverWidth = keyof typeof widthClasses

export type PopoverContentProps = RadixPopover.PopoverContentProps & {
  width?: PopoverWidth
}

export const PopoverContent = forwardRef<HTMLDivElement, PopoverContentProps>(
  ({ className, width = 'fit', children, sideOffset = 6, ...props }, ref) => (
    <RadixPopover.Portal>
      <RadixPopover.Content
        ref={ref}
        sideOffset={sideOffset}
        className={[
          'z-50 rounded-lg border border-border bg-panel p-1 shadow-md outline-none',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          'data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2',
          'data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2',
          widthClasses[width],
          className,
        ].filter(Boolean).join(' ')}
        {...props}
      >
        {children}
      </RadixPopover.Content>
    </RadixPopover.Portal>
  ),
)
PopoverContent.displayName = 'PopoverContent'

export type PopoverMenuItemData = {
  icon?: ReactNode
  label: ReactNode
  description?: ReactNode
  onClick?: () => void
  disabled?: boolean
}

export type PopoverMenuItem = PopoverMenuItemData | null | false | undefined

export function PopoverMenu({ items }: { items: PopoverMenuItem[] }) {
  return (
    <>
      {items.map((item, index) => {
        if (!item) return null
        return (
          <button
            key={index}
            type="button"
            disabled={item.disabled}
            onClick={item.onClick}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-text-primary outline-none hover:bg-hover disabled:pointer-events-none disabled:opacity-50"
          >
            {item.icon ? <span className="flex-shrink-0 text-text-secondary">{item.icon}</span> : null}
            <div className="flex flex-col items-start min-w-0">
              <span>{item.label}</span>
              {item.description ? (
                <span className="text-xs text-text-muted">{item.description}</span>
              ) : null}
            </div>
          </button>
        )
      })}
    </>
  )
}
