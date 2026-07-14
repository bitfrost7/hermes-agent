import { useQuery } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'

import { PageLoader } from '@/components/page-loader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RowButton } from '@/components/ui/row-button'
import { useI18n } from '@/i18n'
import { Loader2, Play, RefreshCw, Square, ExternalLink } from '@/lib/icons'
import { notify, notifyError } from '@/store/notifications'

import {
  cancelWorkflowRun,
  listWorkflowRuns,
  listWorkflows,
  runWorkflow,
  type WorkflowInfo,
  type WorkflowRun
} from '../../hermes'
import { useRefreshHotkey } from '../hooks/use-refresh-hotkey'
import { DetailColumn, DetailPane, ListColumn, ListStrip, ListStripButton, MasterDetail } from '../master-detail'
import { PageSearchShell } from '../page-search-shell'
import { PanelEmpty } from '../overlays/panel'
import { asText, includesQuery } from '../settings/helpers'
import type { SetStatusbarItemGroup } from '../shell/statusbar-controls'

const WORKFLOWS_QUERY_KEY = ['workflows-list'] as const
const RUNS_QUERY_KEY = ['workflows-runs'] as const

interface WorkflowsViewProps {
  setStatusbarItemGroup?: SetStatusbarItemGroup
}

function statusBadge(status: string | null | undefined) {
  if (!status) return null
  const s = status.toLowerCase()
  const variant =
    s === 'running' || s === 'created' ? 'default' :
    s === 'completed' || s === 'finished' ? 'secondary' :
    s === 'failed' || s === 'error' ? 'destructive' :
    s === 'waiting' || s === 'paused' ? 'outline' :
    'default'
  return <Badge variant={variant as any}>{status}</Badge>
}

function triggerLabel(trigger: { type: string } | undefined): string {
  if (!trigger) return '—'
  return trigger.type || '—'
}

export function WorkflowsView({ setStatusbarItemGroup: _setStatusbarItemGroup, ...props }: WorkflowsViewProps) {
  const { t } = useI18n()
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data: workflowsData, isLoading: loadingWorkflows, refetch: refetchWorkflows } = useQuery({
    queryKey: WORKFLOWS_QUERY_KEY,
    queryFn: listWorkflows,
  })

  const { data: runsData, isLoading: loadingRuns, refetch: refetchRuns } = useQuery({
    queryKey: RUNS_QUERY_KEY,
    queryFn: () => listWorkflowRuns('active'),
  })

  const workflows = useMemo(() => workflowsData?.workflows ?? [], [workflowsData])
  const runs = useMemo(() => runsData?.runs ?? [], [runsData])

  const filtered = useMemo(
    () => workflows.filter(w => includesQuery(asText(w.id), query) || includesQuery(asText(w.name), query)),
    [workflows, query]
  )

  const selected = useMemo(
    () => workflows.find(w => w.id === selectedId) ?? null,
    [workflows, selectedId]
  )

  const selectedRuns = useMemo(
    () => runs.filter(r => r.workflow_id === selectedId),
    [runs, selectedId]
  )

  useRefreshHotkey(() => {
    refetchWorkflows()
    refetchRuns()
  })

  const handleRun = useCallback(async (workflowId: string) => {
    try {
      const result = await runWorkflow(workflowId)
      notify(`Started run ${result.run_id} (${result.status})`)
      refetchRuns()
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Failed to start workflow')
    }
  }, [refetchRuns])

  const handleCancel = useCallback(async (runId: string) => {
    try {
      await cancelWorkflowRun(runId)
      notify(`Cancelled run ${runId}`)
      refetchRuns()
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Failed to cancel run')
    }
  }, [refetchRuns])

  const loading = loadingWorkflows

  return (
    <PageSearchShell
      query={query}
      onQueryChange={setQuery}
      onRefresh={() => { refetchWorkflows(); refetchRuns() }}
      searchPlaceholder="Search workflows..."
      {...props}
    >
      <MasterDetail>
        <ListColumn>
          {loading || loadingWorkflows ? (
            <div className="flex items-center justify-center p-8">
              <PageLoader />
            </div>
          ) : filtered.length === 0 ? (
            <PanelEmpty
              icon={ExternalLink}
              title={query ? 'No workflows match your search' : 'No workflows found'}
              description={query ? 'Try a different search term' : 'Create a workflow to get started'}
            />
          ) : (
            <ListStrip>
              {filtered.map(workflow => (
                <ListStripButton
                  key={workflow.id}
                  active={selectedId === workflow.id}
                  onClick={() => setSelectedId(workflow.id)}
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">
                        {workflow.name || workflow.id}
                      </span>
                      {!workflow.enabled && (
                        <Badge variant="outline" className="text-[10px]">disabled</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{workflow.scope}</span>
                      <span>·</span>
                      <span>{triggerLabel(workflow.trigger)}</span>
                      {workflow.last_status && (
                        <>
                          <span>·</span>
                          {statusBadge(workflow.last_status)}
                        </>
                      )}
                    </div>
                  </div>
                </ListStripButton>
              ))}
            </ListStrip>
          )}
        </ListColumn>

        <DetailColumn>
          {selected ? (
            <DetailPane>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold">{selected.name || selected.id}</h2>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {selected.summary || `Workflow in ${selected.scope}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => handleRun(selected.id)}
                    disabled={!selected.enabled}
                  >
                    <Play className="h-3.5 w-3.5 mr-1" />
                    Run
                  </Button>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="rounded bg-muted px-2 py-0.5">ID: {selected.id}</span>
                <span className="rounded bg-muted px-2 py-0.5">Scope: {selected.scope}</span>
                <span className="rounded bg-muted px-2 py-0.5">Trigger: {triggerLabel(selected.trigger)}</span>
                <span className="rounded bg-muted px-2 py-0.5">
                  Status: {selected.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>

              {/* Recent runs */}
              <div className="mt-6">
                <h3 className="mb-2 text-sm font-medium">Active Runs</h3>
                {selectedRuns.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No active runs</p>
                ) : (
                  <div className="space-y-1">
                    {selectedRuns.map(run => (
                      <div
                        key={run.run_id}
                        className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          <span className="truncate text-xs font-mono">{run.run_id.slice(0, 16)}…</span>
                          {statusBadge(run.status)}
                          {run.current_node && (
                            <span className="text-xs text-muted-foreground">
                              @ {run.current_node}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {run.status === 'running' || run.status === 'created' ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs"
                              onClick={() => handleCancel(run.run_id)}
                            >
                              <Square className="h-3 w-3 mr-1" />
                              Cancel
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </DetailPane>
          ) : (
            <div className="flex h-full items-center justify-center">
              <PanelEmpty
                icon={ExternalLink}
                title="Select a workflow"
                description="Choose a workflow from the list to view its details and runs"
              />
            </div>
          )}
        </DetailColumn>
      </MasterDetail>
    </PageSearchShell>
  )
}
