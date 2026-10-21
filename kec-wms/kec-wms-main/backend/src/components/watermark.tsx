'use client'

import { useEffect, useRef, useState, startTransition } from 'react'
import { useTheme } from 'next-themes'

const WATERMARK_TIMEZONE = 'Asia/Shanghai'

function formatWatermarkDateTime(date: Date) {
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: WATERMARK_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date)

  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ''

  return `${getPart('year')}-${getPart('month')}-${getPart('day')} ${getPart('hour')}:${getPart('minute')}`
}

interface WatermarkProps {
  text: string
  fontSize?: number
  rotate?: number
  gap?: number
}

export function Watermark({
  text,
  fontSize = 14,
  rotate = -20,
  gap = 150,
}: WatermarkProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [dateTime, setDateTime] = useState('')

  useEffect(() => {
    startTransition(() => {
      setMounted(true)
    })
  }, [])

  useEffect(() => {
    const updateDateTime = () => {
      setDateTime(formatWatermarkDateTime(new Date()))
    }

    updateDateTime()
    const timer = window.setInterval(updateDateTime, 60 * 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!containerRef.current || !mounted) return

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Keep the watermark readable without competing with foreground content.
    const color = resolvedTheme === 'dark'
      ? 'rgba(255, 255, 255, 0.05)'
      : 'rgba(0, 0, 0, 0.06)'

    const ratio = window.devicePixelRatio || 1
    const canvasWidth = gap * 2 * ratio
    const canvasHeight = gap * 2 * ratio

    canvas.width = canvasWidth
    canvas.height = canvasHeight

    ctx.scale(ratio, ratio)
    ctx.imageSmoothingEnabled = false
    ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
    ctx.fillStyle = color
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    const watermarkLines = dateTime ? [text, dateTime] : [text]

    // 旋转并绘制水印
    ctx.translate(gap, gap)
    ctx.rotate((rotate * Math.PI) / 180)
    const lineHeight = fontSize + 6
    const startY = -((watermarkLines.length - 1) * lineHeight) / 2
    watermarkLines.forEach((line, index) => {
      ctx.fillText(line, 0, startY + index * lineHeight)
    })

    const dataUrl = canvas.toDataURL('image/png')
    containerRef.current.style.backgroundImage = `url(${dataUrl})`
    containerRef.current.style.backgroundSize = `${gap * 2}px ${gap * 2}px`
  }, [text, dateTime, fontSize, rotate, gap, resolvedTheme, mounted])

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-[9999]"
      style={{
        backgroundRepeat: 'repeat',
      }}
    />
  )
}
