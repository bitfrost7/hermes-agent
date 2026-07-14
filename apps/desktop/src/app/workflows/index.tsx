import { App } from '../workflows-editor/App'
import { cn } from '@/lib/utils'

export function WorkflowsView() {
  return (
    <div className={cn(
      'flex h-full w-full flex-1 flex-col overflow-hidden',
      // Offset the SPA's negative margins and clear the titlebar
      '[&_.hw-root]:!m-0 [&_.hw-root]:!h-full',
      'pt-(--titlebar-height)'
    )}>
      <App />
    </div>
  )
}
