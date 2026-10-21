import 'next-auth'
import { DefaultSession } from 'next-auth'
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      tenantId: string
      tenantCode: string
      tenantName: string
      username: string
      userType: string
      passwordExpired: boolean
    } & DefaultSession['user']
  }

  interface User {
    id: string
    tenantId: string
    tenantCode: string
    tenantName: string
    username: string
    userType: string
    passwordExpired: boolean
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    tenantId: string
    tenantCode: string
    tenantName: string
    username: string
    userType: string
    passwordExpired: boolean
  }
}
