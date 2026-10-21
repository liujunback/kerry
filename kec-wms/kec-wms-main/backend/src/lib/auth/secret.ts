function readAuthSecret(): string {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET

  if (!secret) {
    throw new Error(
      'AUTH_SECRET or NEXTAUTH_SECRET is required for auth token signing and verification'
    )
  }

  return secret.trim()
}

export function getAuthSecret(): Uint8Array {
  return new TextEncoder().encode(readAuthSecret())
}
