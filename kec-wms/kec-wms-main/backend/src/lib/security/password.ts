import bcrypt from 'bcryptjs'
import crypto from 'crypto'

const SALT_ROUNDS = 12

/**
 * 对密码进行哈希处理
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

/**
 * 验证密码是否正确
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/**
 * 密码复杂度验证规则
 * - 至少8位
 * - 包含大写字母
 * - 包含小写字母
 * - 包含数字
 * - 包含特殊字符
 */
export interface PasswordValidationResult {
  isValid: boolean
  errors: string[]
}

export function validatePasswordComplexity(password: string): PasswordValidationResult {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push('密码长度至少8位')
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('密码必须包含大写字母')
  }

  if (!/[a-z]/.test(password)) {
    errors.push('密码必须包含小写字母')
  }

  if (!/[0-9]/.test(password)) {
    errors.push('密码必须包含数字')
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('密码必须包含特殊字符')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * 检查密码是否过期
 * @param passwordExpiresAt 密码过期时间
 * @returns 是否过期
 */
export function isPasswordExpired(passwordExpiresAt: Date | null): boolean {
  if (!passwordExpiresAt) {
    return false
  }
  return new Date() > passwordExpiresAt
}

/**
 * 计算密码过期时间（90天后）
 */
export function calculatePasswordExpiryDate(): Date {
  const expiryDate = new Date()
  expiryDate.setDate(expiryDate.getDate() + 90)
  return expiryDate
}

/**
 * 生成符合复杂度要求的随机密码
 * 规则：包含大写字母、小写字母、数字、特殊字符
 * @param length 密码长度，默认12位
 */
export function generateSecurePassword(length: number = 12): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const numbers = '0123456789'
  const special = '@$!%*?&#^'

  // 确保每种字符至少有一个
  let password = ''
  password += uppercase[crypto.randomInt(uppercase.length)]
  password += lowercase[crypto.randomInt(lowercase.length)]
  password += numbers[crypto.randomInt(numbers.length)]
  password += special[crypto.randomInt(special.length)]

  // 填充剩余字符
  const allChars = uppercase + lowercase + numbers + special
  for (let i = password.length; i < length; i++) {
    password += allChars[crypto.randomInt(allChars.length)]
  }

  // 打乱顺序
  return password
    .split('')
    .sort(() => crypto.randomInt(3) - 1)
    .join('')
}
