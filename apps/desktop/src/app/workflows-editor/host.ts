// Desktop-native host bindings. Replaces the Hermes dashboard Plugin SDK with
// direct calls to the Desktop's window.hermesDesktop.api().
import type { ComponentType } from "react";
import { createApiClient, type WorkflowsApi } from "./api/client";

// Minimal SDK stub - the SAP only needs React and fetchJSON from it.
const desktopFetchJSON = <T = unknown>(path: string, init?: RequestInit): Promise<T> => {
  // Map the SPA's path conventions to Hermes Desktop API calls
  const api = (window as any).hermesDesktop?.api;
  if (!api) {
    return Promise.reject(new Error("Hermes Desktop API not available"));
  }
  const method = (init?.method as string) || "GET";
  const body = init?.body ? (typeof init.body === "string" ? JSON.parse(init.body) : init.body) : undefined;
  return api({ path, method, body });
};

export interface HermesPluginSdk {
  React: typeof import("react");
  hooks: Record<string, unknown>;
  api: unknown;
  fetchJSON: <T = unknown>(path: string, init?: RequestInit) => Promise<T>;
  components: Record<string, ComponentType<Record<string, unknown>>>;
}

export interface HermesPluginRegistry {
  register: (name: string, component: ComponentType) => void;
  registerSlot: (slot: string, component: ComponentType) => void;
}

// No-op registry - the SPA registers itself but we mount it directly.
const noopRegistry: HermesPluginRegistry = {
  register: () => {},
  registerSlot: () => {},
};

export function getBasePath(): string {
  return "";
}

export function getSdk(): HermesPluginSdk {
  // Return a minimal SDK with just what the SPA needs
  return {
    React: require("react"),
    hooks: {},
    api: {},
    fetchJSON: desktopFetchJSON,
    components: {},
  };
}

export function getRegistry(): HermesPluginRegistry {
  return noopRegistry;
}

let cachedClient: WorkflowsApi | undefined;

export function getApiClient(): WorkflowsApi {
  cachedClient ??= createApiClient(desktopFetchJSON);
  return cachedClient;
}
