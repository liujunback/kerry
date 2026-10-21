import { existsSync } from 'node:fs'
import { join, relative, resolve, sep, dirname, isAbsolute } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = dirname(scriptDir)
const backendRoot = join(repoRoot, 'backend')
const eslintBin = join(backendRoot, 'node_modules', 'eslint', 'bin', 'eslint.js')

const backendFiles = process.argv
  .slice(2)
  .map((filePath) => resolve(repoRoot, filePath))
  .filter((filePath) => isBackendFile(filePath))
  .filter((filePath) => existsSync(filePath))

if (backendFiles.length === 0) {
  process.exit(0)
}

if (!existsSync(eslintBin)) {
  console.error('Missing backend ESLint installation. Run `cd backend && npm ci` first.')
  process.exit(1)
}

const result = spawnSync(process.execPath, [eslintBin, '--no-warn-ignored', '--no-error-on-unmatched-pattern', ...backendFiles], {
  cwd: backendRoot,
  stdio: 'inherit',
})

process.exit(result.status ?? 1)

function isBackendFile(filePath) {
  const normalizedPath = isAbsolute(filePath) ? filePath : resolve(repoRoot, filePath)
  const relativePath = relative(backendRoot, normalizedPath)

  if (relativePath.startsWith('..') || relativePath.includes(`..${sep}`)) {
    return false
  }

  return /\.(js|jsx|ts|tsx)$/.test(normalizedPath)
}
