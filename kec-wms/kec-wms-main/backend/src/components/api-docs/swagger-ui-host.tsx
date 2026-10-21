'use client'

import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    SwaggerUIBundle?: (config: Record<string, unknown>) => {
      getSystem?: () => unknown
    }
  }
}

type SwaggerBundle = (config: Record<string, unknown>) => {
  getSystem?: () => unknown
}

const SWAGGER_BUNDLE_SCRIPT_ID = 'swagger-ui-bundle-script'
const SWAGGER_BUNDLE_SRC = '/api/internal/swagger-ui-bundle'

function ensureSwaggerBundle() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('window is not available'))
  }

  if (window.SwaggerUIBundle) {
    return Promise.resolve(window.SwaggerUIBundle)
  }

  const existing = document.getElementById(SWAGGER_BUNDLE_SCRIPT_ID) as HTMLScriptElement | null
  if (existing) {
    return new Promise<SwaggerBundle>((resolve, reject) => {
      existing.addEventListener('load', () => {
        if (window.SwaggerUIBundle) {
          resolve(window.SwaggerUIBundle)
          return
        }
        reject(new Error('Swagger bundle is unavailable after script load'))
      }, { once: true })
      existing.addEventListener('error', () => reject(new Error('Failed to load swagger bundle')), { once: true })
    })
  }

  return new Promise<SwaggerBundle>((resolve, reject) => {
    const script = document.createElement('script')
    script.id = SWAGGER_BUNDLE_SCRIPT_ID
    script.src = SWAGGER_BUNDLE_SRC
    script.async = true
    script.onload = () => {
      if (window.SwaggerUIBundle) {
        resolve(window.SwaggerUIBundle)
        return
      }
      reject(new Error('Swagger bundle is unavailable after script load'))
    }
    script.onerror = () => reject(new Error('Failed to load swagger bundle'))
    document.body.appendChild(script)
  })
}

interface SwaggerUiHostProps {
  specText: string
  onComplete?: (system: unknown) => void
}

export function SwaggerUiHost({ specText, onComplete }: SwaggerUiHostProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let cancelled = false
    let objectUrl: string | null = null

    const mountSwagger = async () => {
      const container = containerRef.current
      if (!container) return

      container.innerHTML = ''

      const SwaggerUIBundle = await ensureSwaggerBundle()
      if (!SwaggerUIBundle || cancelled) return

      objectUrl = URL.createObjectURL(
        new Blob([specText], { type: 'application/yaml;charset=utf-8' })
      )

      const instance = SwaggerUIBundle({
        url: objectUrl,
        domNode: container,
        docExpansion: 'list',
        defaultModelsExpandDepth: 1,
        displayRequestDuration: true,
        filter: false,
        showExtensions: true,
        showCommonExtensions: true,
        tryItOutEnabled: true,
        supportedSubmitMethods: ['get', 'post', 'put', 'delete', 'patch'],
        deepLinking: false,
        persistAuthorization: true,
        onComplete: () => {
          if (!cancelled) {
            onComplete?.(instance?.getSystem?.())
          }
        },
      })
    }

    mountSwagger().catch((error) => {
      console.error('Failed to mount Swagger UI:', error)
    })

    return () => {
      cancelled = true
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }
    }
  }, [onComplete, specText])

  return <div ref={containerRef} />
}
