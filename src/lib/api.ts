import { useCallback, useEffect, useRef, useState } from 'react'

const TOKEN_KEY = 'nabd-token'
export const LOGOUT_EVENT = 'nabd:logout'

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}
export const setToken = (t: string | null) => {
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* storage unavailable */
  }
}

export class ApiError extends Error {
  /** Per-field messages from server validation, keyed by field name. */
  fields: Record<string, string> = {}
  constructor(
    message: string,
    public status: number,
  ) {
    super(message)
  }
}

interface Options {
  method?: 'GET' | 'POST' | 'PATCH'
  body?: unknown
  /** Public endpoints (donor sign-up, login) do not send or require the token. */
  auth?: boolean
  signal?: AbortSignal
}

export async function api<T>(path: string, { method = 'GET', body, auth = true, signal }: Options = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(`/api${path}`, {
      method,
      signal,
      headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(auth && getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e
    throw new ApiError('Cannot reach the server. Check your connection and try again.', 0)
  }

  const text = await res.text()
  let data: unknown = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    /* non-JSON error page */
  }
  if (res.ok) return data as T

  if (res.status === 401 && auth) {
    setToken(null)
    window.dispatchEvent(new Event(LOGOUT_EVENT))
  }
  const raw = (data as { message?: string | string[] } | null)?.message
  const messages = Array.isArray(raw) ? raw : raw ? [raw] : []
  const err = new ApiError(messages[0] ?? (res.status === 429 ? 'Too many attempts. Wait a minute and try again.' : 'Something went wrong. Try again.'), res.status)
  // Nest validation messages start with the field name: "age must not be less than 18".
  for (const m of messages) {
    const field = m.split(' ')[0]
    if (!err.fields[field]) err.fields[field] = m
  }
  throw err
}

/** Loads `path` and reloads when it changes. Pass `refreshMs` for live data. `null` skips the request. */
export function useApi<T>(path: string | null, refreshMs?: number) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [loading, setLoading] = useState(path !== null)
  const [tick, setTick] = useState(0)
  const first = useRef(true)

  useEffect(() => {
    if (path === null) return
    const ctl = new AbortController()
    // Only the first load shows a skeleton. Later refreshes swap data in quietly.
    if (first.current || !data) setLoading(true)
    api<T>(path, { signal: ctl.signal })
      .then((d) => {
        setData(d)
        setError(null)
      })
      .catch((e) => {
        if ((e as Error).name !== 'AbortError') setError(e as ApiError)
      })
      .finally(() => {
        if (!ctl.signal.aborted) {
          setLoading(false)
          first.current = false
        }
      })
    return () => ctl.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, tick])

  useEffect(() => {
    if (!refreshMs || path === null) return
    const id = setInterval(() => setTick((t) => t + 1), refreshMs)
    return () => clearInterval(id)
  }, [refreshMs, path])

  const reload = useCallback(() => setTick((t) => t + 1), [])
  return { data, error, loading, reload }
}
