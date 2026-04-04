import type { Session } from '../../client/types.js'
import { SessionItem } from './SessionItem.js'

type SessionListClassNames = {
  root?: string
  header?: string
  list?: string
  empty?: string
  newButton?: string
  item?: string
  itemSelected?: string
  itemLabel?: string
  itemMeta?: string
  itemDeleteButton?: string
}

export function SessionList(
  {
    sessions,
    loading,
    selectedSessionId,
    onCreateSession,
    onSelectSession,
    onDeleteSession,
    className,
    classNames,
  }: {
    sessions: Session[]
    loading?: boolean
    selectedSessionId?: string
    onCreateSession?: () => void
    onSelectSession?: (id: string) => void
    onDeleteSession?: (id: string) => void
    className?: string
    classNames?: SessionListClassNames
  },
) {
  return (
    <aside className={[classNames?.root, className].filter(Boolean).join(' ')}>
      <div className={classNames?.header}>
        <button
          type="button"
          className={classNames?.newButton}
          onClick={() => onCreateSession?.()}
          disabled={Boolean(loading)}
        >
          New Session
        </button>
      </div>
      {sessions.length === 0 ? (
        <div className={classNames?.empty}>
          {loading ? 'Loading sessions...' : 'No sessions yet.'}
        </div>
      ) : (
        <ul className={classNames?.list}>
          {sessions.map((session) => (
            <SessionItem
              key={session.id}
              session={session}
              selected={session.id === selectedSessionId}
              onSelect={onSelectSession}
              onDelete={onDeleteSession}
              className={classNames?.item}
              classNames={{
                selectedRoot: classNames?.itemSelected,
                label: classNames?.itemLabel,
                meta: classNames?.itemMeta,
                deleteButton: classNames?.itemDeleteButton,
              }}
            />
          ))}
        </ul>
      )}
    </aside>
  )
}
