import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { basename, dirname, extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = dirname(scriptDir)

const decoder = new TextDecoder('utf-8', { fatal: true })

const rawArgs = process.argv.slice(2)
const args = new Set(rawArgs)
const checkAll = args.has('--all')
const explicitFiles = rawArgs.filter((arg) => !arg.startsWith('--'))

const textExtensions = new Set([
  '.bat',
  '.cjs',
  '.cmd',
  '.conf',
  '.css',
  '.csv',
  '.dockerignore',
  '.env',
  '.example',
  '.gitignore',
  '.html',
  '.js',
  '.json',
  '.jsx',
  '.md',
  '.mdx',
  '.mjs',
  '.mts',
  '.ps1',
  '.scss',
  '.sh',
  '.sql',
  '.svg',
  '.ts',
  '.tsx',
  '.txt',
  '.yaml',
  '.yml',
])

const textFileNames = new Set([
  '.editorconfig',
  '.eslintignore',
  '.eslintrc',
  '.gitattributes',
  '.gitignore',
  '.npmrc',
  '.nvmrc',
  'Dockerfile',
  'docker-compose.yml',
  'README.md',
  'components.json',
  'next-env.d.ts',
  'pnpm-workspace.yaml',
  'sonar-project.properties',
  'tsconfig.json',
])

function readGitFileList(commandArgs) {
  const output = execFileSync('git', commandArgs, {
    cwd: repoRoot,
    encoding: 'buffer',
  })

  return output
    .toString('utf8')
    .split('\0')
    .filter(Boolean)
}

function listCandidateFiles() {
  const files = checkAll
    ? listAllFiles()
    : explicitFiles.length > 0
      ? normalizeExplicitFiles(explicitFiles)
      : listWorktreeFiles()

  return [...new Set(files)].filter((filePath) => isTextFile(filePath))
}

function normalizeExplicitFiles(filePaths) {
  return filePaths
    .map((filePath) => relative(repoRoot, resolve(repoRoot, filePath)).split('\\').join('/'))
    .filter((filePath) => !filePath.startsWith('..'))
    .filter((filePath) => existsSync(join(repoRoot, filePath)))
}

function listAllFiles() {
  return readGitFileList(['ls-files', '-z', '--cached', '--others', '--exclude-standard'])
}

function listWorktreeFiles() {
  try {
    const trackedChanges = readGitFileList(['diff', '--name-only', '-z', '--diff-filter=ACMR', 'HEAD'])
    const untrackedFiles = readGitFileList(['ls-files', '-z', '--others', '--exclude-standard'])

    return [...trackedChanges, ...untrackedFiles]
  } catch {
    return listAllFiles()
  }
}

function isTextFile(filePath) {
  const fileName = basename(filePath)
  const lowerFileName = fileName.toLowerCase()
  const extension = extname(lowerFileName)

  if (textFileNames.has(fileName) || textFileNames.has(lowerFileName)) {
    return true
  }

  if (lowerFileName.startsWith('.env')) {
    return true
  }

  return textExtensions.has(extension)
}

function hasUtf8Bom(buffer) {
  return buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf
}

function validateUtf8(buffer) {
  decoder.decode(buffer)
}

function getExpectedEol(filePath) {
  const extension = extname(filePath).toLowerCase()
  return extension === '.bat' || extension === '.cmd' || extension === '.ps1' ? 'crlf' : 'lf'
}

function validateEol(text, expectedEol) {
  if (expectedEol === 'lf') {
    if (text.includes('\r')) {
      throw new Error('expected LF line endings')
    }

    return
  }

  if (/(^|[^\r])\n/.test(text) || /\r(?!\n)/.test(text)) {
    throw new Error('expected CRLF line endings')
  }
}

const errors = []
const files = listCandidateFiles()

for (const relativePath of files) {
  const absolutePath = join(repoRoot, relativePath)
  const buffer = readFileSync(absolutePath)

  try {
    if (hasUtf8Bom(buffer)) {
      throw new Error('unexpected UTF-8 BOM')
    }

    validateUtf8(buffer)

    const text = buffer.toString('utf8')
    validateEol(text, getExpectedEol(relativePath))
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    errors.push(`${relativePath}: ${message}`)
  }
}

if (errors.length > 0) {
  console.error('Encoding policy check failed:')

  for (const error of errors) {
    console.error(`- ${error}`)
  }

  process.exit(1)
}

console.log(`Encoding policy check passed for ${files.length} files${checkAll ? ' (full scan)' : ' (worktree scan)'}.`)
