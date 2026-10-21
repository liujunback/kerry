import { randomUUID } from 'crypto'
import path from 'path'
import { mkdir, writeFile } from 'fs/promises'
import { NextRequest } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { fail, ok } from '@/lib/returns/api-utils'

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
])

export const POST = createAuthHandler(async (request: NextRequest, auth) => {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) {
      return fail(new Error('请上传照片文件'), 400)
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return fail(new Error('仅支持 jpg/png/webp 图片'), 400)
    }
    if (file.size > MAX_FILE_SIZE) {
      return fail(new Error('单张照片不能超过5MB'), 400)
    }

    const extension = ALLOWED_TYPES.get(file.type)!
    const filename = `${Date.now()}-${randomUUID()}.${extension}`
    const relativeDir = path.join('uploads', 'returns', auth.user.tenantId)
    const absoluteDir = path.join(process.cwd(), 'public', relativeDir)
    await mkdir(absoluteDir, { recursive: true })

    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(path.join(absoluteDir, filename), buffer)

    const url = `/${relativeDir.replace(/\\/g, '/')}/${filename}`
    return ok({ url }, '照片上传成功')
  } catch (error) {
    return fail(error)
  }
})
