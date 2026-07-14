import { useEffect, useState } from 'react'
import {
  getPluginComponent,
  injectPluginSDK,
  loadPluginCSS,
  loadPluginJS,
} from './workflows-plugin'

interface WorkflowsViewProps {
  setStatusbarItemGroup?: unknown
}

/**
 * WorkflowsView — loads the hermes-workflows plugin's built bundle
 * (dashboard/dist/index.js) from the Hermes backend's HTTP endpoint,
 * then mounts its root component.
 *
 * Compared to the old approach (copying the entire SPA source tree into
 * Desktop), this thin wrapper:
 *   - Loads the plugin's compiled dist bundle (no source maintenance)
 *   - Injects __HERMES_PLUGIN_SDK__ with a fetchJSON that routes through
 *     window.hermesDesktop.api() (Electron IPC bridge)
 *   - Auto-updates when the plugin is updated (hermes plugins update)
 *   - Adds zero Desktop-side code beyond this wrapper
 */
export function WorkflowsView(_props: WorkflowsViewProps) {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        // 1. Get the backend base URL from the connection store
        let baseUrl = ''
        try {
          const conn = await (window as any).hermesDesktop?.getConnection?.()
          if (conn?.baseUrl) {
            baseUrl = conn.baseUrl.replace(/\/+$/, '')
          }
        } catch {
          // fall through — baseUrl stays empty
        }

        if (!baseUrl) {
          throw new Error(
            'Could not determine Hermes backend URL. Make sure the backend is running.',
          )
        }

        // 2. Inject the plugin SDK on window (once)
        injectPluginSDK()

        // 3. Load plugin CSS from the Hermes backend
        await loadPluginCSS(baseUrl)

        // 4. Load plugin JS bundle — calls register('hermes-workflows', App)
        await loadPluginJS(baseUrl)

        if (!cancelled) {
          const component = getPluginComponent('hermes-workflows')
          if (!component) {
            throw new Error('Plugin loaded but no component registered')
          }
          setState('ready')
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load workflows plugin')
          setState('error')
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [])

  if (state === 'error') {
    return (
      <div className="flex h-full w-full items-center justify-center p-8">
        <div className="max-w-lg text-center">
          <h2 className="mb-2 text-lg font-semibold">Workflows plugin error</h2>
          <p className="text-(--ui-text-tertiary)">{error}</p>
          <p className="mt-4 text-sm text-(--ui-text-tertiary)">
            Try <code className="rounded bg-(--ui-control-background) px-1 py-0.5">hermes plugins update</code>{' '}
            to update the plugin.
          </p>
        </div>
      </div>
    )
  }

  if (state !== 'ready') {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="text-(--ui-text-tertiary)">Loading workflows…</p>
      </div>
    )
  }

  // Mount the registered plugin component
  const Component = getPluginComponent('hermes-workflows')
  if (!Component) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="text-(--ui-text-tertiary)">Initializing workflows…</p>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <div
        className="[&_.hw-root]:!m-0 [&_.hw-root]:!h-full [&_.hw-root]:!w-full [&_.hw-root]:!pt-(--titlebar-height)"
        style={{ height: '100%', width: '100%' }}
      >
        <Component />
      </div>
    </div>
  )
}
