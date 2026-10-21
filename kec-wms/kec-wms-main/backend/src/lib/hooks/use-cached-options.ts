'use client'

import { useEffect, useState } from 'react'

const optionCache = new Map<string, unknown[]>()

export function useCachedOptions<T>({
  cacheKey,
  fetcher,
}: {
  cacheKey: string
  fetcher: () => Promise<T[]>
}) {
  const cached = optionCache.get(cacheKey) as T[] | undefined
  const [options, setOptions] = useState<T[]>(cached || [])
  const [loading, setLoading] = useState(!cached)

  useEffect(() => {
    if (cached) {
      return
    }

    let cancelled = false

    const load = async () => {
      try {
        const nextOptions = await fetcher()
        if (cancelled) return

        optionCache.set(cacheKey, nextOptions)
        setOptions(nextOptions)
      } catch {
        if (!cancelled) {
          setOptions([])
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [cacheKey, cached, fetcher])

  return {
    options,
    loading,
  }
}
