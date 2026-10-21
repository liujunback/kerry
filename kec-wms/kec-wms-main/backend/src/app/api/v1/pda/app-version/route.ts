import { constants } from 'node:fs'
import { access, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { NextResponse } from 'next/server'
import { z } from 'zod'

export const runtime = 'nodejs'

const PDA_RELEASE_FILE_NAME = 'pda-release.json'
const PDA_DOWNLOAD_PATH = '/pda-download'

const pdaReleaseSchema = z
  .object({
    versionCode: z.number().int().positive(),
    versionName: z.string().trim().min(1),
    minSupportedVersionCode: z.number().int().nonnegative(),
    forceUpdate: z.boolean(),
    downloadUrl: z.literal(PDA_DOWNLOAD_PATH),
    releaseNotes: z.array(z.string().trim().min(1)).default([]),
    fileSize: z.number().int().positive(),
    fileSha256: z.string().regex(/^[a-fA-F0-9]{64}$/),
    publishedAt: z.string().datetime({ offset: true }),
  })
  .refine(
    (value) => value.minSupportedVersionCode <= value.versionCode,
    {
      message: 'minSupportedVersionCode 不能大于 versionCode',
      path: ['minSupportedVersionCode'],
    }
  )

export async function GET() {
  const filePath = join(process.cwd(), 'public', 'downloads', PDA_RELEASE_FILE_NAME)

  try {
    await access(filePath, constants.R_OK)
  } catch {
    return NextResponse.json(
      { success: false, message: 'PDA 版本信息暂未发布，请稍后重试' },
      {
        status: 404,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  }

  try {
    const raw = await readFile(filePath, 'utf8')
    const parsed = pdaReleaseSchema.safeParse(JSON.parse(raw))

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'PDA 版本信息格式无效',
          errors: parsed.error.flatten(),
        },
        {
          status: 500,
          headers: {
            'Cache-Control': 'no-store',
          },
        }
      )
    }

    return NextResponse.json(
      {
        success: true,
        data: parsed.data,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  } catch (error) {
    console.error('读取 PDA 版本信息失败:', error)
    return NextResponse.json(
      { success: false, message: '读取 PDA 版本信息失败，请稍后重试' },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  }
}
