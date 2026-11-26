"use client";

export interface FetchResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
  offline: boolean;
  timedOut: boolean;
  sessionExpired: boolean;
  permissionDenied: boolean;
}

export interface FetchOptions extends RequestInit {
  timeoutMs?: number;
  slowThresholdMs?: number;
  onSlow?: () => void;
}

/**
 * Production fetch wrapper handling:
 * - No internet (instant offline detection)
 * - Slow network (fires `onSlow` after 3.5s so UI tells the user)
 * - Request timeout (aborts cleanly after 12s instead of hanging forever)
 * - Session expired (401) & Permission denied (403)
 */
export async function fetchSafe<T = Record<string, unknown>>(
  url: string,
  options: FetchOptions = {}
): Promise<FetchResult<T>> {
  const {
    timeoutMs = 12_000,
    slowThresholdMs = 3_500,
    onSlow,
    ...init
  } = options;

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: "No internet connection. Reconnect and try again.",
      offline: true,
      timedOut: false,
      sessionExpired: false,
      permissionDenied: false,
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const slowId = onSlow ? setTimeout(onSlow, slowThresholdMs) : null;

  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
    });

    let data: T | null = null;
    try {
      data = (await res.json()) as T;
    } catch {
      data = null;
    }

    const serverErr =
      data && typeof data === "object" && "error" in data && typeof (data as { error?: unknown }).error === "string"
        ? (data as { error: string }).error
        : null;

    if (res.status === 401) {
      return {
        ok: false,
        status: 401,
        data,
        error: serverErr || "Your session expired. Please sign in again.",
        offline: false,
        timedOut: false,
        sessionExpired: true,
        permissionDenied: false,
      };
    }

    if (res.status === 403) {
      return {
        ok: false,
        status: 403,
        data,
        error: serverErr || "You do not have permission to perform this action.",
        offline: false,
        timedOut: false,
        sessionExpired: false,
        permissionDenied: true,
      };
    }

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        data,
        error: serverErr || "Something went wrong. Please try again.",
        offline: false,
        timedOut: false,
        sessionExpired: false,
        permissionDenied: false,
      };
    }

    return {
      ok: true,
      status: res.status,
      data,
      error: null,
      offline: false,
      timedOut: false,
      sessionExpired: false,
      permissionDenied: false,
    };
  } catch (err) {
    const isAbort = err instanceof Error && err.name === "AbortError";
    const isOffline = typeof navigator !== "undefined" && !navigator.onLine;

    return {
      ok: false,
      status: 0,
      data: null,
      error: isOffline
        ? "No internet connection. Reconnect and try again."
        : isAbort
          ? "Request timed out due to a slow connection. Tap Retry."
          : "Network error. Please check your connection and try again.",
      offline: isOffline,
      timedOut: isAbort,
      sessionExpired: false,
      permissionDenied: false,
    };
  } finally {
    clearTimeout(timeoutId);
    if (slowId) clearTimeout(slowId);
  }
}

// In-memory cache for immutable static JSON assets (countries, geo chunks, reveal manifest)
const jsonCache = new Map<string, unknown>();

export async function fetchCachedJson<T>(
  url: string,
  options?: FetchOptions
): Promise<FetchResult<T>> {
  if (jsonCache.has(url)) {
    return {
      ok: true,
      status: 200,
      data: jsonCache.get(url) as T,
      error: null,
      offline: false,
      timedOut: false,
      sessionExpired: false,
      permissionDenied: false,
    };
  }

  const res = await fetchSafe<T>(url, options);
  if (res.ok && res.data !== null) {
    jsonCache.set(url, res.data);
  }
  return res;
}
