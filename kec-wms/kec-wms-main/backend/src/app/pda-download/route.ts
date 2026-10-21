import { constants, createReadStream } from 'node:fs'
import { access } from 'node:fs/promises'
import { join } from 'node:path'
import { Readable } from 'node:stream'

export const runtime = 'nodejs'

const PDA_APK_FILE_NAME = 'pda.apk'

export async function GET() {
  const filePath = join(process.cwd(), 'public', 'downloads', PDA_APK_FILE_NAME)

  try {
    await access(filePath, constants.R_OK)
  } catch {
    return new Response('PDA 安装包暂未上传，请稍后重试。', {
      status: 404,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    })
  }

  const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/vnd.android.package-archive',
      'Content-Disposition': `attachment; filename="${PDA_APK_FILE_NAME}"`,
      'Cache-Control': 'no-store',
    },
  })
}
