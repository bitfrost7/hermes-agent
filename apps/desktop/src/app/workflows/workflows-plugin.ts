/**
 * workflows-plugin.ts
 *
 * Injects __HERMES_PLUGIN_SDK__ and __HERMES_PLUGINS__ for the
 * hermes-workflows dashboard plugin (built bundle), then loads its
 * dist/index.js and dist/index.css via the Hermes backend's
 * /dashboard-plugins/ HTTP endpoint so the plugin registers its App
 * component.
 *
 * This is the same pattern the browser Dashboard uses
 * (web/src/plugins/registry.ts) — only the "fetchJSON" transport
 * is adapted to Desktop's hermesDesktop.api() IPC bridge instead of
 * direct HTTP fetch() + session-token header.
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useContext,
  createContext,
  useLayoutEffect,
} from 'react'

// ---- types matching the browser Dashboard's plugin SDK contract --------

export interface HermesPluginSdk {
  sdkVersion: string
  React: typeof import('react')
  hooks: Record<string, unknown>
  api: unknown
  fetchJSON: <T = unknown>(path: string, init?: RequestInit) => Promise<T>
  authedFetch: (url: string, init?: RequestInit) => Promise<Response>
  buildWsUrl: (path: string) => string
  buildWsAuthParam: () => [string, string]
  components: Record<string, React.ComponentType<Record<string, unknown>>>
  utils: {
    cn: (...classes: (string | undefined | null | false)[]) => string
    timeAgo: (date: Date | number | string) => string
    isoTimeAgo: (date: Date | number | string) => string
  }
  useI18n: () => { t: (key: string, params?: Record<string, string>) => string }
}

export interface HermesPluginRegistry {
  register: (name: string, component: React.ComponentType) => void
  registerSlot: (slot: string, component: React.ComponentType) => void
}

// ---- Desktop fetchJSON adapter ----------------------------------------
// The browser dashboard's fetchJSON uses standard fetch() with session
// token headers. Desktop communicates with the Hermes backend through
// Electron's IPC bridge (window.hermesDesktop.api), which handles auth
// automatically. The call surface is the same: url + RequestInit → JSON.

function desktopFetchJSON<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const api = (window as any).hermesDesktop?.api
  if (!api) {
    return Promise.reject(new Error('Hermes Desktop API not available'))
  }
  const method = (init?.method as string) || 'GET'
  let body: unknown = undefined
  if (init?.body) {
    try {
      body = typeof init.body === 'string' ? JSON.parse(init.body) : init.body
    } catch {
      body = init.body
    }
  }
  return api({ path, method, body })
}

// ---- minimal cn utility -----------------------------------------------
function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

// ---- i18n stub --------------------------------------------------------
const I18N_STUB = { t: (_key: string, _params?: Record<string, string>) => '' }

function useI18nStub(): { t: (key: string, params?: Record<string, string>) => string } {
  return I18N_STUB
}

// ---- inject SDK + registry onto window --------------------------------

let registered = false

const _registeredComponents = new Map<string, React.ComponentType>()

export function getPluginComponent(name: string): React.ComponentType | undefined {
  return _registeredComponents.get(name)
}

export function injectPluginSDK(): void {
  if (registered) return
  registered = true

  const pluginRegistry: HermesPluginRegistry = {
    register: (name, component) => {
      _registeredComponents.set(name, component)
    },
    registerSlot: () => {
      // Not used by hermes-workflows; no-op
    },
  }

  const pluginSdk: HermesPluginSdk = {
    sdkVersion: '1.1.0',
    React,
    hooks: {
      useState,
      useEffect,
      useCallback,
      useMemo,
      useRef,
      useContext,
      createContext,
    },
    api: {},
    fetchJSON: desktopFetchJSON,
    authedFetch: (_url: string, _init?: RequestInit) => {
      return desktopFetchJSON(_url, _init).then(
        (data) => new Response(JSON.stringify(data), { status: 200 }),
      )
    },
    buildWsUrl: (_path: string) => '',
    buildWsAuthParam: () => ['', ''],
    components: {},
    utils: { cn, timeAgo: () => '', isoTimeAgo: () => '' },
    useI18n: useI18nStub,
  }

  ;(window as any).__HERMES_PLUGINS__ = pluginRegistry
  ;(window as any).__HERMES_PLUGIN_SDK__ = pluginSdk
  ;(window as any).__HERMES_BASE_PATH__ = ''
}

// ---- load plugin CSS via the Hermes backend's HTTP endpoint -----------

export function loadPluginCSS(baseUrl: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLLinkElement>(
      'link[data-plugin-css="hermes-workflows"]',
    )
    if (existing) {
      resolve()
      return
    }
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = `${baseUrl}/dashboard-plugins/hermes-workflows/dist/index.css`
    link.dataset.pluginCss = 'hermes-workflows'
    link.onload = () => resolve()
    link.onerror = () => reject(new Error('Failed to load plugin CSS'))
    document.head.appendChild(link)
  })
}

// ---- load plugin JS bundle via the Hermes backend's HTTP endpoint -----

export function loadPluginJS(baseUrl: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-plugin-js="hermes-workflows"]',
    )
    if (existing) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = `${baseUrl}/dashboard-plugins/hermes-workflows/dist/index.js`
    script.dataset.pluginJs = 'hermes-workflows'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load plugin JS'))
    document.body.appendChild(script)
  })
}
