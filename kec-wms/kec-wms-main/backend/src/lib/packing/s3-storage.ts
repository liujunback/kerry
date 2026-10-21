import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'

interface PackingVideoS3Config {
  accessKeyId: string
  secretAccessKey: string
  region: string
  bucket: string
  endpoint?: string
  forcePathStyle: boolean
}

let cachedConfig: PackingVideoS3Config | null = null
let cachedClient: S3Client | null = null

function pickEnv(...keys: string[]): string | null {
  for (const key of keys) {
    const value = process.env[key]
    if (value && value.trim().length > 0) {
      return value.trim()
    }
  }
  return null
}

function getPackingVideoS3Config(): PackingVideoS3Config {
  if (cachedConfig) {
    return cachedConfig
  }

  const accessKeyIdRaw = pickEnv('AWS_KEY', 'AWS_ACCESS_KEY_ID')
  const secretAccessKeyRaw = pickEnv('AWS_SECRET', 'AWS_SECRET_ACCESS_KEY')
  const regionRaw = pickEnv('AWS_REGION')
  const bucketRaw = pickEnv('AWS_BUCKET', 'AWS_S3_BUCKET')
  const endpoint = pickEnv('AWS_ENDPOINT', 'AWS_S3_ENDPOINT')
  const forcePathStyleRaw = pickEnv('AWS_FORCE_PATH_STYLE', 'AWS_S3_FORCE_PATH_STYLE')

  const missing: string[] = []
  if (!accessKeyIdRaw) missing.push('AWS_KEY 或 AWS_ACCESS_KEY_ID')
  if (!secretAccessKeyRaw) missing.push('AWS_SECRET 或 AWS_SECRET_ACCESS_KEY')
  if (!regionRaw) missing.push('AWS_REGION')
  if (!bucketRaw) missing.push('AWS_BUCKET 或 AWS_S3_BUCKET')

  if (missing.length > 0) {
    throw new Error(`S3配置缺失: ${missing.join(', ')}`)
  }
  const accessKeyId = accessKeyIdRaw as string
  const secretAccessKey = secretAccessKeyRaw as string
  const region = regionRaw as string
  const bucket = bucketRaw as string

  const config: PackingVideoS3Config = {
    accessKeyId,
    secretAccessKey,
    region,
    bucket,
    endpoint: endpoint || undefined,
    forcePathStyle: forcePathStyleRaw === 'true',
  }
  cachedConfig = config

  return config
}

function getPackingVideoS3Client(): S3Client {
  if (cachedClient) {
    return cachedClient
  }

  const config = getPackingVideoS3Config()
  cachedClient = new S3Client({
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle,
  })
  return cachedClient
}

async function bodyToUint8Array(body: unknown): Promise<Uint8Array> {
  if (body && typeof (body as { transformToByteArray?: () => Promise<Uint8Array> }).transformToByteArray === 'function') {
    return (body as { transformToByteArray: () => Promise<Uint8Array> }).transformToByteArray()
  }

  if (body instanceof Uint8Array) {
    return body
  }

  if (typeof body === 'string') {
    return new TextEncoder().encode(body)
  }

  if (body && typeof (body as { arrayBuffer?: () => Promise<ArrayBuffer> }).arrayBuffer === 'function') {
    const arrayBuffer = await (body as { arrayBuffer: () => Promise<ArrayBuffer> }).arrayBuffer()
    return new Uint8Array(arrayBuffer)
  }

  if (!body || typeof (body as AsyncIterable<unknown>)[Symbol.asyncIterator] !== 'function') {
    throw new Error('S3对象内容格式不支持')
  }

  const chunks: Buffer[] = []
  for await (const chunk of body as AsyncIterable<unknown>) {
    if (typeof chunk === 'string') {
      chunks.push(Buffer.from(chunk))
      continue
    }
    if (chunk instanceof Uint8Array) {
      chunks.push(Buffer.from(chunk))
      continue
    }
    if (Buffer.isBuffer(chunk)) {
      chunks.push(chunk)
      continue
    }
    throw new Error('S3对象内容分片类型不支持')
  }

  return new Uint8Array(Buffer.concat(chunks))
}

export function normalizeS3ObjectKey(raw: string): string {
  const text = raw.trim()
  if (!text) return ''

  if (/^s3:\/\//i.test(text)) {
    const withoutProtocol = text.replace(/^s3:\/\//i, '')
    const slashIndex = withoutProtocol.indexOf('/')
    return slashIndex >= 0 ? withoutProtocol.slice(slashIndex + 1) : ''
  }

  if (/^https?:\/\//i.test(text)) {
    try {
      const url = new URL(text)
      return decodeURIComponent(url.pathname.replace(/^\/+/, ''))
    } catch {
      return text.replace(/^\/+/, '')
    }
  }

  return text.replace(/^\/+/, '')
}

export async function downloadPackingVideoFromS3(objectKey: string): Promise<{
  bytes: Uint8Array
  contentType: string
  contentLength: number
}> {
  const key = normalizeS3ObjectKey(objectKey)
  if (!key) {
    throw new Error('对象Key为空，无法下载')
  }

  const config = getPackingVideoS3Config()
  const client = getPackingVideoS3Client()
  const result = await client.send(new GetObjectCommand({
    Bucket: config.bucket,
    Key: key,
  }))

  if (!result.Body) {
    throw new Error('S3对象内容为空')
  }

  const bytes = await bodyToUint8Array(result.Body)
  return {
    bytes,
    contentType: result.ContentType || 'application/octet-stream',
    contentLength: result.ContentLength ? Number(result.ContentLength) : bytes.byteLength,
  }
}
