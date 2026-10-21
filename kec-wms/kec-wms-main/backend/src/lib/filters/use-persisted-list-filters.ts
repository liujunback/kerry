'use client'

import { useEffect, useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

type FilterValues<FilterKey extends string> = Record<FilterKey, string>
type FilterValueResolver<FilterKey extends string> =
  | Partial<FilterValues<FilterKey>>
  | (() => Partial<FilterValues<FilterKey>>)

interface UsePersistedListFiltersOptions<FilterKey extends string> {
  storageKey: string
  filterKeys: readonly FilterKey[]
  pathname?: string
  pageParam?: string
  initializeDefaults?: FilterValueResolver<FilterKey>
  resetTo?: FilterValueResolver<FilterKey>
}

function readFilterValues<FilterKey extends string>(
  searchParams: ReturnType<typeof useSearchParams>,
  filterKeys: readonly FilterKey[]
): FilterValues<FilterKey> {
  return filterKeys.reduce((result, key) => {
    result[key] = searchParams.get(key) || ''
    return result
  }, {} as FilterValues<FilterKey>)
}

function hasActiveFilters<FilterKey extends string>(filters: FilterValues<FilterKey>) {
  return Object.values(filters).some(Boolean)
}

function buildUrl(pathname: string, params: URLSearchParams) {
  const query = params.toString()
  return query ? `${pathname}?${query}` : pathname
}

function resolveFilterValues<FilterKey extends string>(
  value?: FilterValueResolver<FilterKey>
): Partial<FilterValues<FilterKey>> {
  if (!value) return {}
  return typeof value === 'function' ? value() : value
}

function applyFiltersToParams<FilterKey extends string>(
  params: URLSearchParams,
  filterKeys: readonly FilterKey[],
  values: Partial<FilterValues<FilterKey>>
) {
  for (const key of filterKeys) {
    const value = values[key]
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
  }
}

export function usePersistedListFilters<FilterKey extends string>({
  storageKey,
  filterKeys,
  pathname: pathnameOverride,
  pageParam = 'page',
  initializeDefaults,
  resetTo,
}: UsePersistedListFiltersOptions<FilterKey>) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentPathname = usePathname()
  const pathname = pathnameOverride || currentPathname
  const currentFilters = readFilterValues(searchParams, filterKeys)
  const formKey = filterKeys.map((key) => `${key}:${currentFilters[key]}`).join('|')
  const defaultFilters = useMemo(
    () => resolveFilterValues(initializeDefaults),
    [initializeDefaults]
  )

  useEffect(() => {
    if (typeof window === 'undefined') return

    if (hasActiveFilters(currentFilters)) {
      window.localStorage.setItem(storageKey, JSON.stringify(currentFilters))
      return
    }

    // If the URL already contains any explicit query state (for example `page=1`),
    // treat it as an intentional navigation result and do not restore cached filters.
    if (searchParams.toString()) return

    const cachedFilters = window.localStorage.getItem(storageKey)
    if (cachedFilters) {
      try {
        const parsed = JSON.parse(cachedFilters) as Partial<FilterValues<FilterKey>>
        const restoredFilters = filterKeys.reduce((result, key) => {
          result[key] = parsed[key] || ''
          return result
        }, {} as FilterValues<FilterKey>)

        if (!hasActiveFilters(restoredFilters)) {
          window.localStorage.removeItem(storageKey)
        } else {
          const params = new URLSearchParams(searchParams.toString())
          params.set(pageParam, '1')
          applyFiltersToParams(params, filterKeys, restoredFilters)
          router.replace(buildUrl(pathname, params))
          return
        }
      } catch {
        window.localStorage.removeItem(storageKey)
      }
    }

    if (!Object.values(defaultFilters).some(Boolean)) return

    const params = new URLSearchParams(searchParams.toString())
    params.set(pageParam, '1')
    applyFiltersToParams(params, filterKeys, defaultFilters)
    router.replace(buildUrl(pathname, params))
  }, [
    currentFilters,
    defaultFilters,
    filterKeys,
    pageParam,
    pathname,
    router,
    searchParams,
    storageKey,
  ])

  const clearStoredFilters = () => {
    if (typeof window === 'undefined') return
    window.localStorage.removeItem(storageKey)
  }

  const resetToDefaults = () => {
    clearStoredFilters()

    const nextFilters = resolveFilterValues(resetTo ?? initializeDefaults)
    const params = new URLSearchParams()
    applyFiltersToParams(params, filterKeys, nextFilters)

    if (Object.values(nextFilters).some(Boolean)) {
      params.set(pageParam, '1')
    }

    router.push(buildUrl(pathname, params))
  }

  return {
    currentFilters,
    formKey,
    clearStoredFilters,
    resetToDefaults,
  }
}
