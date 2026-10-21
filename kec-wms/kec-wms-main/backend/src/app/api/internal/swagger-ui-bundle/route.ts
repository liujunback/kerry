import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { NextResponse } from 'next/server'

export const dynamic = 'force-static'

export async function GET() {
  try {
    const filePath = join(
      process.cwd(),
      'node_modules',
      'swagger-ui-react',
      'swagger-ui-bundle.js'
    )
    const content = await readFile(filePath, 'utf8')

    return new NextResponse(content, {
      headers: {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    console.error('Failed to load swagger-ui bundle:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to load swagger-ui bundle' },
      { status: 500 }
    )
  }
}
