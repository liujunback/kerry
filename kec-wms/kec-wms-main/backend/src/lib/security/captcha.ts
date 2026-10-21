import { getRedisClient } from '@/lib/db/redis'

const CAPTCHA_PREFIX = 'captcha:'
const CAPTCHA_EXPIRE_SECONDS = 300 // 5分钟过期

// 滑动拼图验证码配置
const CANVAS_WIDTH = 320
const CANVAS_HEIGHT = 160
const PIECE_SIZE = 44 // 拼图块大小
const PIECE_RADIUS = 8 // 拼图凸起半径
const TOLERANCE = 5 // 验证容差（像素）

export interface SliderCaptchaResult {
  captchaId: string
  bgSvg: string
  pieceSvg: string
  y: number
}

// 预设调色板（柔和自然的配色方案）
const PALETTES = [
  { bg: ['#1a5276', '#2e86c1', '#85c1e9'], accent: ['#f39c12', '#e74c3c', '#27ae60'] },
  { bg: ['#1b4332', '#2d6a4f', '#52b788'], accent: ['#f4a261', '#e76f51', '#264653'] },
  { bg: ['#3c1642', '#7b2d8e', '#c77dff'], accent: ['#f72585', '#4cc9f0', '#4361ee'] },
  { bg: ['#0d1b2a', '#1b3a4b', '#3d5a80'], accent: ['#ee6c4d', '#f4845f', '#98c1d9'] },
  { bg: ['#2b2d42', '#5c677d', '#8d99ae'], accent: ['#ef233c', '#edf2f4', '#d90429'] },
  { bg: ['#003049', '#d62828', '#f77f00'], accent: ['#fcbf49', '#eae2b7', '#003049'] },
]

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min
}

function randInt(min: number, max: number) {
  return Math.floor(rand(min, max))
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

// 生成拼图块的 SVG path（带凸起的正方形）
function puzzlePiecePath(x: number, y: number, s: number, r: number): string {
  return [
    `M ${x} ${y}`,
    `L ${x + s * 0.4} ${y}`,
    `A ${r} ${r} 0 1 1 ${x + s * 0.6} ${y}`,
    `L ${x + s} ${y}`,
    `L ${x + s} ${y + s * 0.4}`,
    `A ${r} ${r} 0 1 1 ${x + s} ${y + s * 0.6}`,
    `L ${x + s} ${y + s}`,
    `L ${x} ${y + s}`,
    `Z`,
  ].join(' ')
}

// 生成山脉轮廓路径
function mountainPath(baseY: number, amplitude: number, segments: number): string {
  const points: string[] = [`M 0 ${CANVAS_HEIGHT}`]
  const segW = CANVAS_WIDTH / segments
  for (let i = 0; i <= segments; i++) {
    const x = i * segW
    const y = baseY - rand(0, amplitude) + Math.sin(i * 0.8) * amplitude * 0.5
    points.push(`L ${x} ${y}`)
  }
  points.push(`L ${CANVAS_WIDTH} ${CANVAS_HEIGHT} Z`)
  return points.join(' ')
}

// 生成丰富的风景 SVG 背景
function generateBackground(): string {
  const palette = pickRandom(PALETTES)
  const skyTop = palette.bg[0]
  const skyBottom = palette.bg[1]
  const midColor = palette.bg[2]

  let svg = ''

  // 天空渐变
  svg += `<defs>`
  svg += `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">`
  svg += `<stop offset="0%" stop-color="${skyTop}"/>`
  svg += `<stop offset="100%" stop-color="${skyBottom}"/>`
  svg += `</linearGradient>`
  svg += `</defs>`
  svg += `<rect width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" fill="url(#sky)"/>`

  // 星星/光点
  for (let i = 0; i < 20; i++) {
    const cx = rand(0, CANVAS_WIDTH)
    const cy = rand(0, CANVAS_HEIGHT * 0.6)
    const r = rand(0.5, 2)
    const opacity = rand(0.2, 0.6)
    svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="white" opacity="${opacity}"/>`
  }

  // 远山（浅色）
  const farMountain = mountainPath(80, 35, 8)
  svg += `<path d="${farMountain}" fill="${midColor}" opacity="0.3"/>`

  // 中山
  const midMountain = mountainPath(100, 30, 10)
  svg += `<path d="${midMountain}" fill="${midColor}" opacity="0.5"/>`

  // 近山（深色）
  const nearMountain = mountainPath(120, 25, 12)
  svg += `<path d="${nearMountain}" fill="${palette.bg[0]}" opacity="0.4"/>`

  // 装饰元素（浮动几何体增加复杂度）
  for (let i = 0; i < 6; i++) {
    const x = rand(10, CANVAS_WIDTH - 30)
    const y = rand(10, CANVAS_HEIGHT - 30)
    const size = rand(8, 25)
    const color = pickRandom(palette.accent)
    const opacity = rand(0.15, 0.35)
    const rotation = rand(0, 360)

    if (Math.random() > 0.5) {
      svg += `<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="${color}" opacity="${opacity}" rx="3" transform="rotate(${rotation} ${x + size / 2} ${y + size / 2})"/>`
    } else {
      svg += `<circle cx="${x}" cy="${y}" r="${size / 2}" fill="${color}" opacity="${opacity}"/>`
    }
  }

  // 噪点纹理（增加辨识难度）
  for (let i = 0; i < 30; i++) {
    const x = rand(0, CANVAS_WIDTH)
    const y = rand(0, CANVAS_HEIGHT)
    const opacity = rand(0.03, 0.08)
    svg += `<rect x="${x}" y="${y}" width="2" height="2" fill="${Math.random() > 0.5 ? 'white' : 'black'}" opacity="${opacity}"/>`
  }

  return svg
}

/**
 * 生成滑动拼图验证码
 */
export async function generateCaptcha(): Promise<SliderCaptchaResult> {
  const targetX = randInt(PIECE_SIZE + 60, CANVAS_WIDTH - PIECE_SIZE * 2 - 20)
  const targetY = randInt(PIECE_RADIUS + 10, CANVAS_HEIGHT - PIECE_SIZE - PIECE_RADIUS * 2 - 20)

  const captchaId = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
  const key = `${CAPTCHA_PREFIX}${captchaId}`

  const redis = getRedisClient()
  await redis.setex(key, CAPTCHA_EXPIRE_SECONDS, targetX.toString())

  const bgContent = generateBackground()
  const piecePath = puzzlePiecePath(targetX, targetY, PIECE_SIZE, PIECE_RADIUS)

  // 背景 SVG（带缺口 — 内阴影效果）
  const bgSvg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" viewBox="0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}">`,
    bgContent,
    // 缺口：半透明暗色 + 内阴影
    `<defs><filter id="hole"><feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur"/>`,
    `<feOffset dx="1" dy="1" result="off"/><feFlood flood-color="rgba(0,0,0,0.6)"/>`,
    `<feComposite in2="off" operator="in"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`,
    `<path d="${piecePath}" fill="rgba(0,0,0,0.5)" stroke="rgba(255,255,255,0.3)" stroke-width="1" filter="url(#hole)"/>`,
    `</svg>`,
  ].join('')

  // 拼图块 SVG
  const pieceW = PIECE_SIZE + PIECE_RADIUS * 2
  const pieceH = PIECE_SIZE + PIECE_RADIUS * 2
  const localPath = puzzlePiecePath(0, 0, PIECE_SIZE, PIECE_RADIUS)
  const pieceSvg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${pieceW}" height="${pieceH}" viewBox="0 0 ${pieceW} ${pieceH}">`,
    `<defs>`,
    `<clipPath id="pc"><path d="${localPath}"/></clipPath>`,
    `<filter id="ps"><feDropShadow dx="0" dy="0" stdDeviation="2" flood-color="rgba(0,0,0,0.5)"/></filter>`,
    `</defs>`,
    `<g filter="url(#ps)">`,
    `<g clip-path="url(#pc)" transform="translate(${-targetX},${-targetY})">`,
    bgContent,
    `</g>`,
    `<path d="${localPath}" fill="none" stroke="rgba(255,255,255,0.9)" stroke-width="1.5"/>`,
    `</g>`,
    `</svg>`,
  ].join('')

  return { captchaId, bgSvg, pieceSvg, y: targetY }
}

/**
 * 验证滑动拼图验证码
 */
export async function verifyCaptcha(captchaId: string, x: string): Promise<boolean> {
  const key = `${CAPTCHA_PREFIX}${captchaId}`
  const redis = getRedisClient()
  const storedX = await redis.get(key)

  if (!storedX) return false

  await redis.del(key)

  const targetX = parseInt(storedX, 10)
  const userX = parseInt(x, 10)

  if (isNaN(targetX) || isNaN(userX)) return false

  return Math.abs(targetX - userX) <= TOLERANCE
}

/**
 * 删除验证码
 */
export async function deleteCaptcha(captchaId: string): Promise<void> {
  const key = `${CAPTCHA_PREFIX}${captchaId}`
  const redis = getRedisClient()
  await redis.del(key)
}
