import { memo } from 'react'
import type { ReactNode } from 'react'
import type { ToolExecution } from '../../client/types.js'
import type { AgentTurn } from '../../state/group-messages.js'
import type { MessageItemClassNames } from './MessageItem.js'
import { MessageItem } from './MessageItem.js'
import { ToolTimeline } from './timeline/index.js'

export const AgentTurnView = memo(function AgentTurnView({
  turn,
  toolExecutions,
  renderAvatar,
  onCopy,
  onRegenerate,
  classNames,
}: {
  turn: AgentTurn
  toolExecutions?: Map<string, ToolExecution>
  renderAvatar?: (message: import('../../client/types.js').ChatMessage) => ReactNode
  onCopy?: (message: import('../../client/types.js').ChatMessage) => void
  onRegenerate?: (message: import('../../client/types.js').ChatMessage) => void
  classNames?: MessageItemClassNames
}) {
  const hasSteps = turn.steps.length > 0

  return (
    <div className="flex flex-col w-full">
      {hasSteps && (
        <ToolTimeline
          steps={turn.steps}
          toolExecutions={toolExecutions}
          streaming={turn.steps.some(s => !s.result)}
        />
      )}
      {turn.finalAnswer && (
        <MessageItem
          message={turn.finalAnswer}
          renderAvatar={renderAvatar}
          onCopy={onCopy}
          onRegenerate={onRegenerate}
          classNames={classNames}
        />
      )}
    </div>
  )
})
