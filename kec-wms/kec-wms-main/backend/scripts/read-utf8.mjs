import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function usage() {
  console.error('Usage: node scripts/read-utf8.mjs <path> [startLine] [endLine]')
  process.exit(1)
}

const [, , inputPath, startArg, endArg] = process.argv

if (!inputPath) {
  usage()
}

const startLine = startArg ? Number.parseInt(startArg, 10) : 1
const endLine = endArg ? Number.parseInt(endArg, 10) : undefined

if (Number.isNaN(startLine) || startLine < 1) {
  console.error('startLine must be a positive integer.')
  process.exit(1)
}

if (endArg && (Number.isNaN(endLine) || endLine < startLine)) {
  console.error('endLine must be greater than or equal to startLine.')
  process.exit(1)
}

const absolutePath = resolve(process.cwd(), inputPath)
const text = readFileSync(absolutePath, 'utf8')
const lines = text.split(/\r?\n/)
const lastLine = endLine ?? lines.length

for (let lineNumber = startLine; lineNumber <= Math.min(lastLine, lines.length); lineNumber += 1) {
  process.stdout.write(`${String(lineNumber).padStart(4, ' ')}: ${lines[lineNumber - 1]}\n`)
}
