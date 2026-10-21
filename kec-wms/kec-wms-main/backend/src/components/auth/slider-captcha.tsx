'use client'

import { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react'
import { RefreshCw, Loader2, CheckCircle, XCircle, ArrowRight } from 'lucide-react'

const CANVAS_WIDTH = 320
const CANVAS_HEIGHT = 160
const PIECE_SIZE = 44
const PIECE_RADIUS = 8
const PIECE_TOTAL = PIECE_SIZE + PIECE_RADIUS * 2

interface CaptchaData {
  captchaId: string
  bgSvg: string
  pieceSvg: string
  y: number
}

type CaptchaStatus = 'idle' | 'dragging' | 'success' | 'fail'

export interface SliderCaptchaRef {
  setSuccess: () => void
  setFail: () => void
  refresh: () => void
}

interface SliderCaptchaProps {
  onVerify: (captchaId: string, x: number) => void
}

const THUMB_W = 44

export const SliderCaptcha = forwardRef<SliderCaptchaRef, SliderCaptchaProps>(
  function SliderCaptcha({ onVerify }, ref) {
    const [captcha, setCaptcha] = useState<CaptchaData | null>(null)
    const [loading, setLoading] = useState(false)
    const [status, setStatus] = useState<CaptchaStatus>('idle')
    const [sliderX, setSliderX] = useState(0)
    const dragging = useRef(false)
    const startX = useRef(0)
    const maxSlide = CANVAS_WIDTH - PIECE_TOTAL - 4

    const fetchCaptcha = useCallback(async () => {
      setLoading(true)
      setStatus('idle')
      setSliderX(0)
      try {
        const res = await fetch('/api/v1/auth/captcha')
        const data = await res.json()
        if (data.success) setCaptcha(data.data)
      } catch (err) {
        console.error('Failed to fetch captcha:', err)
      } finally {
        setLoading(false)
      }
    }, [])

    useEffect(() => { fetchCaptcha() }, [fetchCaptcha])

    useImperativeHandle(ref, () => ({
      setSuccess: () => setStatus('success'),
      setFail: () => {
        setStatus('fail')
        setTimeout(() => fetchCaptcha(), 800)
      },
      refresh: fetchCaptcha,
    }), [fetchCaptcha])

    const handleDragStart = (clientX: number) => {
      if (status === 'success') return
      dragging.current = true
      startX.current = clientX - sliderX
      setStatus('dragging')
    }

    const handleDragMove = useCallback((clientX: number) => {
      if (!dragging.current) return
      setSliderX(Math.max(0, Math.min(clientX - startX.current, maxSlide)))
    }, [maxSlide])

    const handleDragEnd = useCallback(() => {
      if (!dragging.current || !captcha) return
      dragging.current = false
      onVerify(captcha.captchaId, Math.round(sliderX))
    }, [captcha, sliderX, onVerify])

    useEffect(() => {
      const onMM = (e: MouseEvent) => handleDragMove(e.clientX)
      const onMU = () => handleDragEnd()
      const onTM = (e: TouchEvent) => { if (e.touches.length === 1) handleDragMove(e.touches[0].clientX) }
      const onTE = () => handleDragEnd()
      window.addEventListener('mousemove', onMM)
      window.addEventListener('mouseup', onMU)
      window.addEventListener('touchmove', onTM, { passive: true })
      window.addEventListener('touchend', onTE)
      return () => {
        window.removeEventListener('mousemove', onMM)
        window.removeEventListener('mouseup', onMU)
        window.removeEventListener('touchmove', onTM)
        window.removeEventListener('touchend', onTE)
      }
    }, [handleDragMove, handleDragEnd])

    const fillPct = (sliderX / maxSlide) * 100

    const trackBg =
      status === 'success' ? 'linear-gradient(90deg, #22c55e, #4ade80)' :
      status === 'fail' ? 'linear-gradient(90deg, #ef4444, #f87171)' :
      `linear-gradient(90deg, #3b82f6 0%, #60a5fa ${fillPct}%, transparent ${fillPct}%)`

    const thumbBg =
      status === 'success' ? '#22c55e' :
      status === 'fail' ? '#ef4444' :
      status === 'dragging' ? '#3b82f6' : '#ffffff'

    const thumbColor =
      status === 'success' || status === 'fail' ? '#fff' :
      status === 'dragging' ? '#fff' : '#94a3b8'

    return (
      <div className="w-full select-none" style={{ maxWidth: CANVAS_WIDTH }}>
        {/* 图片区域 */}
        <div
          className="relative overflow-hidden bg-muted/30"
          style={{
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
            borderRadius: '8px 8px 0 0',
            border: '1px solid hsl(var(--border))',
            borderBottom: 'none',
          }}
        >
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : captcha ? (
            <>
              <div dangerouslySetInnerHTML={{ __html: captcha.bgSvg }} />
              <div
                className="absolute top-0 left-0 pointer-events-none"
                style={{
                  transform: `translate(${sliderX}px, ${captcha.y}px)`,
                  width: PIECE_TOTAL,
                  height: PIECE_TOTAL,
                  transition: dragging.current ? 'none' : 'transform 0.15s ease',
                }}
                dangerouslySetInnerHTML={{ __html: captcha.pieceSvg }}
              />
            </>
          ) : null}
          {/* 刷新按钮 */}
          <button
            type="button"
            onClick={fetchCaptcha}
            className="absolute top-2 right-2 p-1.5 rounded-full backdrop-blur-sm bg-white/20 hover:bg-white/40 text-white transition-all shadow-sm"
            aria-label="刷新验证码"
          >
            <RefreshCw className="h-3 w-3" />
          </button>
        </div>

        {/* 滑动条 */}
        <div
          className="relative overflow-hidden"
          style={{
            height: 42,
            borderRadius: '0 0 8px 8px',
            border: '1px solid hsl(var(--border))',
            background: 'hsl(var(--muted) / 0.3)',
          }}
        >
          {/* 进度填充 */}
          <div
            className="absolute inset-y-0 left-0 transition-colors"
            style={{
              width: sliderX + THUMB_W,
              background: trackBg,
              opacity: 0.15,
              borderRadius: '0 0 0 8px',
            }}
          />

          {/* 提示文字 */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {status === 'idle' && !loading && (
              <span className="text-xs text-muted-foreground flex items-center gap-1.5 tracking-wide">
                <ArrowRight className="h-3 w-3" />
                向右拖动滑块完成验证
              </span>
            )}
            {status === 'success' && (
              <span className="text-xs text-green-600 flex items-center gap-1 font-medium">
                <CheckCircle className="h-3.5 w-3.5" /> 验证成功
              </span>
            )}
            {status === 'fail' && (
              <span className="text-xs text-red-500 flex items-center gap-1 font-medium">
                <XCircle className="h-3.5 w-3.5" /> 验证失败，请重试
              </span>
            )}
          </div>

          {/* 滑块 */}
          <div
            className="absolute top-0 h-full flex items-center justify-center cursor-grab active:cursor-grabbing transition-shadow"
            style={{
              left: sliderX,
              width: THUMB_W,
              background: thumbBg,
              color: thumbColor,
              borderRight: '1px solid hsl(var(--border))',
              borderRadius: sliderX === 0 ? '0 0 0 8px' : '0',
              boxShadow: status === 'dragging'
                ? '2px 0 8px rgba(59,130,246,0.3)'
                : '1px 0 3px rgba(0,0,0,0.08)',
            }}
            onMouseDown={(e) => { e.preventDefault(); handleDragStart(e.clientX) }}
            onTouchStart={(e) => { if (e.touches.length === 1) handleDragStart(e.touches[0].clientX) }}
          >
            {status === 'success' ? (
              <CheckCircle className="h-5 w-5" />
            ) : status === 'fail' ? (
              <XCircle className="h-5 w-5" />
            ) : (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M5 2l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
        </div>
      </div>
    )
  }
)
