import type { Session } from '../../client/types.js'

type SessionItemClassNames = {
  root?: string
  selectedRoot?: string
  label?: string
  meta?: string
  deleteButton?: string
}

export function SessionItem(
  {
    session,
    selected,
    onSelect,
    onDelete,
    className,
    classNames,
  }: {
    session: Session
    selected?: boolean
    onSelect?: (id: string) => void
    onDelete?: (id: string) => void
    className?: string
    classNames?: SessionItemClassNames
  },
) {
  const updatedAt = new Date(session.updatedAt).toLocaleString()

  return (
    <li
      className={[
        classNames?.root,
        selected ? classNames?.selectedRoot : undefined,
        className,
      ].filter(Boolean).join(' ')}
      role="button"
      tabIndex={0}
      aria-current={selected ? 'true' : undefined}
      onClick={() => onSelect?.(session.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect?.(session.id)
        }
      }}
    >
      <div className={classNames?.label}>{session.label || session.id}</div>
      <div className={classNames?.meta}>{updatedAt}</div>
      <button
        type="button"
        className={classNames?.deleteButton}
        onClick={(e) => {
          e.stopPropagation()
          onDelete?.(session.id)
        }}
      >
        Delete
      </button>
    </li>
  )
}
