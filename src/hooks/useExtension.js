import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

function supportsWindowMessaging() {
  return typeof window !== 'undefined' && typeof window.postMessage === 'function'
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function isResponseType(type) {
  return (
    type === 'MEMACT_SEARCH_RESULT' ||
    type === 'MEMACT_SUGGESTIONS_RESULT' ||
    type === 'MEMACT_STATUS_RESULT' ||
    type === 'MEMACT_STATS_RESULT' ||
    type === 'MEMACT_CLEAR_ALL_DATA_RESULT' ||
    type === 'MEMACT_ERROR'
  )
}

export function useExtension() {
  const [ready, setReady] = useState(false)
  const [detected, setDetected] = useState(false)
  const pending = useRef(new Map())

  const sendToExtension = useCallback((type, payload = {}, timeoutMs = 5000) => {
    if (!supportsWindowMessaging()) {
      return Promise.resolve(null)
    }

    return new Promise((resolve) => {
      const requestId = Math.random().toString(36).slice(2)
      const timer = window.setTimeout(() => {
        pending.current.delete(requestId)
        resolve(null)
      }, timeoutMs)

      pending.current.set(requestId, (value) => {
        window.clearTimeout(timer)
        resolve(value)
      })

      window.postMessage({ type, payload, requestId }, '*')
    })
  }, [])

  const sendWithRetry = useCallback(async (type, payload = {}, options = {}) => {
    const {
      maxRetries = 6,
      initialDelay = 150,
      maxDelay = 1000,
      timeoutMs = 1200,
    } = options

    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      const response = await sendToExtension(type, payload, timeoutMs)
      if (response && !response.error) {
        return response
      }
      if (attempt === maxRetries) {
        return response
      }
      const delay = Math.min(initialDelay * Math.pow(1.5, attempt), maxDelay)
      await sleep(delay)
    }

    return null
  }, [sendToExtension])

  useEffect(() => {
    if (!supportsWindowMessaging()) {
      return undefined
    }

    if (document?.documentElement?.dataset?.memactBridge === 'ready') {
      setDetected(true)
    }

    const onMessage = (event) => {
      if (event.source !== window) {
        return
      }

      const data = event.data || {}
      if (data.type === 'MEMACT_EXTENSION_READY') {
        setDetected(true)
        return
      }

      if (!isResponseType(data.type)) {
        return
      }

      setDetected(true)

      const resolver = pending.current.get(data.requestId)
      if (!resolver) {
        return
      }

      pending.current.delete(data.requestId)

      if (data.type === 'MEMACT_ERROR') {
        resolver({ error: data.error || 'Extension bridge failed.' })
        return
      }

      if (data.type === 'MEMACT_STATUS_RESULT' && data.status) {
        setDetected(true)
        setReady(Boolean(data.status.ready))
      }

      resolver(data.results ?? data.status ?? data.stats ?? data.response ?? null)
    }

    window.addEventListener('message', onMessage)

    let cancelled = false
    const probe = async () => {
      while (!cancelled) {
        const status = await sendWithRetry('MEMACT_STATUS', {}, {
          maxRetries: 8,
          initialDelay: 150,
          maxDelay: 1000,
          timeoutMs: 900,
        })
        if (cancelled) {
          return
        }
        if (status && !status.error) {
          setDetected(true)
          setReady(Boolean(status.ready))
          return
        }
        await sleep(1800)
      }
    }
    probe()

    return () => {
      cancelled = true
      window.removeEventListener('message', onMessage)
    }
  }, [sendWithRetry])

  const search = useCallback((query, limit = 20) => {
    return sendToExtension('MEMACT_SEARCH', { query, limit })
  }, [sendToExtension])

  const getSuggestions = useCallback((query = '', timeFilter = null, limit = 6) => {
    return sendToExtension('MEMACT_SUGGESTIONS', { query, timeFilter, limit })
  }, [sendToExtension])

  const getStatus = useCallback(() => {
    return sendToExtension('MEMACT_STATUS', {})
  }, [sendToExtension])

  const getStats = useCallback(() => {
    return sendToExtension('MEMACT_STATS', {})
  }, [sendToExtension])

  const clearAllData = useCallback(() => {
    return sendToExtension('MEMACT_CLEAR_ALL_DATA', {})
  }, [sendToExtension])

  return useMemo(
    () => ({
      ready,
      detected,
      search,
      getSuggestions,
      getStatus,
      getStats,
      clearAllData,
      sendToExtension,
    }),
    [clearAllData, detected, getStatus, getStats, getSuggestions, ready, search, sendToExtension]
  )
}
