import { Prisma } from '@prisma/client'

function normalizeTarget(metaTarget: unknown): string[] {
  if (Array.isArray(metaTarget)) {
    return metaTarget.map((target) => String(target).toLowerCase())
  }

  if (typeof metaTarget === 'string') {
    return [metaTarget.toLowerCase()]
  }

  return []
}

function normalizeExpectedTarget(expectedTarget: string): string[] {
  const lowerExpectedTarget = expectedTarget.toLowerCase()
  const snakeCaseExpectedTarget = expectedTarget
    .replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
    .toLowerCase()

  return Array.from(new Set([lowerExpectedTarget, snakeCaseExpectedTarget]))
}

export function isUniqueConstraintError(
  error: unknown,
  expectedTargets: string[] = []
): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
    return false
  }

  if (expectedTargets.length === 0) {
    return true
  }

  const targets = normalizeTarget(error.meta?.target)
  return expectedTargets.some((expectedTarget) =>
    normalizeExpectedTarget(expectedTarget).some((candidate) =>
      targets.some((target) => target.includes(candidate))
    )
  )
}
