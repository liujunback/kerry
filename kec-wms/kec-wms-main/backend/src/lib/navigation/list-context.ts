'use client'

const LIST_CONTEXT_PREFIX = 'list-context:'

function getStorageKey(context: string) {
  return `${LIST_CONTEXT_PREFIX}${context}`
}

export function saveListContext(context: string, url: string) {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(getStorageKey(context), url)
}

export function readListContext(context: string, fallbackPath: string) {
  if (typeof window === 'undefined') return fallbackPath

  const value = window.sessionStorage.getItem(getStorageKey(context))
  if (!value) return fallbackPath

  return value.startsWith(fallbackPath) ? value : fallbackPath
}

export function clearListContext(context: string) {
  if (typeof window === 'undefined') return
  window.sessionStorage.removeItem(getStorageKey(context))
}
