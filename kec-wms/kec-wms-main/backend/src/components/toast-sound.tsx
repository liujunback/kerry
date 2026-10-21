'use client'

import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import { useTranslations } from 'next-intl'
import { Volume2, VolumeX } from 'lucide-react'
import { useSonner, type ToastT } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

type ToastSoundType = 'success' | 'error' | 'warning' | 'info'

interface ToastSoundSettings {
  enabled: boolean
  types: Record<ToastSoundType, boolean>
}

type WindowWithWebkitAudioContext = Window & {
  webkitAudioContext?: typeof AudioContext
}

const TOAST_SOUND_STORAGE_KEY = 'kec-wms-toast-sound-settings'
const TOAST_SOUND_EVENT = 'kec-wms-toast-sound-settings-change'

const DEFAULT_TOAST_SOUND_SETTINGS: ToastSoundSettings = {
  enabled: true,
  types: {
    success: true,
    error: true,
    warning: true,
    info: true,
  },
}

function normalizeSettings(value: unknown): ToastSoundSettings {
  if (!value || typeof value !== 'object') {
    return DEFAULT_TOAST_SOUND_SETTINGS
  }

  const candidate = value as Partial<ToastSoundSettings>
  const candidateTypes = (
    candidate.types && typeof candidate.types === 'object'
      ? candidate.types
      : {}
  ) as Partial<Record<ToastSoundType, boolean>>

  return {
    enabled:
      typeof candidate.enabled === 'boolean'
        ? candidate.enabled
        : DEFAULT_TOAST_SOUND_SETTINGS.enabled,
    types: {
      success:
        typeof candidateTypes.success === 'boolean'
          ? candidateTypes.success
          : DEFAULT_TOAST_SOUND_SETTINGS.types.success,
      error:
        typeof candidateTypes.error === 'boolean'
          ? candidateTypes.error
          : DEFAULT_TOAST_SOUND_SETTINGS.types.error,
      warning:
        typeof candidateTypes.warning === 'boolean'
          ? candidateTypes.warning
          : DEFAULT_TOAST_SOUND_SETTINGS.types.warning,
      info:
        typeof candidateTypes.info === 'boolean'
          ? candidateTypes.info
          : DEFAULT_TOAST_SOUND_SETTINGS.types.info,
    },
  }
}

function readToastSoundSettings(): ToastSoundSettings {
  if (typeof window === 'undefined') {
    return DEFAULT_TOAST_SOUND_SETTINGS
  }

  try {
    const storedValue = window.localStorage.getItem(TOAST_SOUND_STORAGE_KEY)
    return normalizeSettings(storedValue ? JSON.parse(storedValue) : null)
  } catch {
    return DEFAULT_TOAST_SOUND_SETTINGS
  }
}

function readToastSoundSettingsSnapshot() {
  return JSON.stringify(readToastSoundSettings())
}

function subscribeToastSoundSettings(onStoreChange: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === TOAST_SOUND_STORAGE_KEY) {
      onStoreChange()
    }
  }

  window.addEventListener(TOAST_SOUND_EVENT, onStoreChange)
  window.addEventListener('storage', handleStorage)

  return () => {
    window.removeEventListener(TOAST_SOUND_EVENT, onStoreChange)
    window.removeEventListener('storage', handleStorage)
  }
}

function useToastSoundSettings() {
  const snapshot = useSyncExternalStore(
    subscribeToastSoundSettings,
    readToastSoundSettingsSnapshot,
    () => JSON.stringify(DEFAULT_TOAST_SOUND_SETTINGS)
  )

  return useMemo(() => normalizeSettings(JSON.parse(snapshot)), [snapshot])
}

function persistToastSoundSettings(settings: ToastSoundSettings) {
  try {
    window.localStorage.setItem(
      TOAST_SOUND_STORAGE_KEY,
      JSON.stringify(normalizeSettings(settings))
    )
  } catch {
    // 即使 localStorage 不可用，也保持当前标签页状态同步。
  }

  window.dispatchEvent(new Event(TOAST_SOUND_EVENT))
}

function getToastSoundType(type: ToastT['type']): ToastSoundType | null {
  if (type === 'loading') {
    return null
  }

  if (type === 'success' || type === 'error' || type === 'warning') {
    return type
  }

  return 'info'
}

function buildToneSequence(type: ToastSoundType) {
  switch (type) {
    case 'success':
      return [
        { frequency: 660, start: 0, duration: 0.1, gain: 0.48 },
        { frequency: 880, start: 0.1, duration: 0.16, gain: 0.52 },
      ]
    case 'error':
      return [
        { frequency: 880, start: 0, duration: 0.18, gain: 0.82 },
        { frequency: 440, start: 0.2, duration: 0.18, gain: 0.82 },
        { frequency: 880, start: 0.42, duration: 0.18, gain: 0.84 },
        { frequency: 440, start: 0.62, duration: 0.24, gain: 0.84 },
      ]
    case 'warning':
      return [
        { frequency: 1320, start: 0, duration: 0.09, gain: 0.7 },
        { frequency: 1320, start: 0.13, duration: 0.09, gain: 0.7 },
        { frequency: 1320, start: 0.26, duration: 0.11, gain: 0.72 },
      ]
    case 'info':
      return [{ frequency: 1040, start: 0, duration: 0.12, gain: 0.58 }]
  }
}

export function ToastSoundPlayer() {
  const { toasts } = useSonner()
  const settings = useToastSoundSettings()
  const audioContextRef = useRef<AudioContext | null>(null)
  const initializedRef = useRef(false)
  const seenRef = useRef(new Set<string>())
  const latestTypesRef = useRef(new Map<string, ToastSoundType>())

  const playSound = useCallback(async (type: ToastSoundType) => {
    try {
      const AudioContextConstructor =
        window.AudioContext ||
        (window as WindowWithWebkitAudioContext).webkitAudioContext

      if (!AudioContextConstructor) {
        return
      }

      const audioContext =
        audioContextRef.current ?? new AudioContextConstructor()
      audioContextRef.current = audioContext

      if (audioContext.state === 'suspended') {
        await audioContext.resume()
      }

      const now = audioContext.currentTime

      for (const tone of buildToneSequence(type)) {
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()
        const startAt = now + tone.start
        const endAt = startAt + tone.duration

        oscillator.type = type === 'success' ? 'sine' : 'square'
        oscillator.frequency.setValueAtTime(tone.frequency, startAt)
        gainNode.gain.setValueAtTime(0.0001, startAt)
        gainNode.gain.exponentialRampToValueAtTime(tone.gain, startAt + 0.015)
        gainNode.gain.exponentialRampToValueAtTime(0.0001, endAt)

        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)
        oscillator.start(startAt)
        oscillator.stop(endAt + 0.02)
      }
    } catch {
      // 浏览器自动播放限制不应影响 toast 渲染。
    }
  }, [])

  useEffect(() => {
    const currentIds = new Set<string>()

    for (const toast of toasts) {
      const id = String(toast.id)
      const type = getToastSoundType(toast.type)
      currentIds.add(id)

      if (!type) {
        continue
      }

      const soundKey = `${id}:${type}`
      const previousType = latestTypesRef.current.get(id)
      latestTypesRef.current.set(id, type)

      if (!initializedRef.current) {
        seenRef.current.add(soundKey)
        continue
      }

      if (previousType === type || seenRef.current.has(soundKey)) {
        continue
      }

      seenRef.current.add(soundKey)

      if (settings.enabled && settings.types[type]) {
        void playSound(type)
      }
    }

    for (const id of latestTypesRef.current.keys()) {
      if (!currentIds.has(id)) {
        latestTypesRef.current.delete(id)
      }
    }

    initializedRef.current = true
  }, [playSound, settings, toasts])

  return null
}

interface ToastSoundControlProps {
  className?: string
}

export function ToastSoundControl({ className }: ToastSoundControlProps) {
  const t = useTranslations('toastSound')
  const settings = useToastSoundSettings()
  const soundTypes: ToastSoundType[] = ['success', 'error', 'warning', 'info']

  const updateSettings = (nextSettings: ToastSoundSettings) => {
    persistToastSoundSettings(nextSettings)
  }

  const handleEnabledChange = (enabled: boolean) => {
    updateSettings({ ...settings, enabled })
  }

  const handleTypeChange = (type: ToastSoundType, enabled: boolean) => {
    updateSettings({
      ...settings,
      types: {
        ...settings.types,
        [type]: enabled,
      },
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'relative h-8 w-8 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground',
            settings.enabled && 'text-primary',
            className
          )}
          title={t('title')}
          aria-label={t('title')}
        >
          {settings.enabled ? (
            <Volume2 className="h-4 w-4" />
          ) : (
            <VolumeX className="h-4 w-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 p-2">
        <DropdownMenuLabel className="px-2 py-1 text-xs text-muted-foreground">
          {t('title')}
        </DropdownMenuLabel>
        <div className="flex items-center justify-between gap-3 rounded-md px-2 py-2">
          <div className="min-w-0">
            <div className="text-sm font-medium">{t('enabled')}</div>
            <div className="text-xs text-muted-foreground">
              {t('enabledDescription')}
            </div>
          </div>
          <Switch
            checked={settings.enabled}
            onCheckedChange={handleEnabledChange}
            aria-label={t('enabled')}
          />
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="px-2 py-1 text-xs text-muted-foreground">
          {t('types')}
        </DropdownMenuLabel>
        <div className="grid gap-1">
          {soundTypes.map((type) => (
            <div
              key={type}
              className="flex h-9 items-center justify-between gap-3 rounded-md px-2 text-sm"
            >
              <span>{t(`typeLabels.${type}`)}</span>
              <Switch
                checked={settings.types[type]}
                onCheckedChange={(checked) => handleTypeChange(type, checked)}
                aria-label={t(`typeLabels.${type}`)}
              />
            </div>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
