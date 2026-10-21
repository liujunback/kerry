import os from 'node:os'

const EXPLICIT_PUBLIC_BASE_URL_KEYS = [
  'PDA_PUBLIC_BASE_URL',
  'APP_PUBLIC_URL',
  'NEXT_PUBLIC_APP_URL',
  'NEXTAUTH_URL',
] as const

function getConfiguredPublicOrigin(): string | null {
  for (const key of EXPLICIT_PUBLIC_BASE_URL_KEYS) {
    const value = process.env[key]?.trim()
    if (!value) continue

    try {
      return new URL(value).origin
    } catch {
      continue
    }
  }

  return null
}

function isWildcardOrLoopbackHost(hostname: string): boolean {
  return ['0.0.0.0', '::', '[::]', 'localhost', '127.0.0.1'].includes(hostname)
}

function isLikelyVirtualInterface(name: string): boolean {
  return /(virtual|virtualbox|vmware|hyper-v|wsl|docker|vethernet|loopback)/i.test(name)
}

function getPreferredLanIp(): string | null {
  const interfaces = os.networkInterfaces()
  const preferred: string[] = []
  const fallback: string[] = []

  for (const [name, networkInterface] of Object.entries(interfaces)) {
    if (!networkInterface) continue

    for (const address of networkInterface) {
      if (address.family !== 'IPv4' || address.internal) continue
      if (address.address.startsWith('169.254.')) continue

      if (isLikelyVirtualInterface(name)) {
        fallback.push(address.address)
      } else {
        preferred.push(address.address)
      }
    }
  }

  return preferred[0] || fallback[0] || null
}

function buildOrigin(protocol: string, host: string): string | null {
  try {
    return new URL(`${protocol}://${host}`).origin
  } catch {
    return null
  }
}

export function resolvePublicOrigin(request: Request): string {
  const configuredOrigin = getConfiguredPublicOrigin()
  if (configuredOrigin) {
    return configuredOrigin
  }

  const requestUrl = new URL(request.url)
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim()
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim()
  const host = forwardedHost || request.headers.get('host') || requestUrl.host
  const protocol = forwardedProto || requestUrl.protocol.replace(':', '')

  if (host) {
    const resolvedFromHost = buildOrigin(protocol, host)
    if (resolvedFromHost) {
      const hostname = new URL(resolvedFromHost).hostname
      if (!isWildcardOrLoopbackHost(hostname)) {
        return resolvedFromHost
      }

      const lanIp = getPreferredLanIp()
      if (lanIp) {
        const port = new URL(resolvedFromHost).port
        return `${protocol}://${lanIp}${port ? `:${port}` : ''}`
      }
    }
  }

  if (!isWildcardOrLoopbackHost(requestUrl.hostname)) {
    return requestUrl.origin
  }

  const lanIp = getPreferredLanIp()
  if (lanIp) {
    return `${requestUrl.protocol}//${lanIp}${requestUrl.port ? `:${requestUrl.port}` : ''}`
  }

  return requestUrl.origin
}
