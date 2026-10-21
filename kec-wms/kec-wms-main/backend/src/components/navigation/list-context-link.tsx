'use client'

import Link, { type LinkProps } from 'next/link'
import { type ReactNode } from 'react'
import { saveListContext } from '@/lib/navigation/list-context'

interface ListContextLinkProps extends LinkProps {
  context: string
  contextUrl: string
  children: ReactNode
  className?: string
}

export function ListContextLink({
  context,
  contextUrl,
  children,
  className,
  ...props
}: ListContextLinkProps) {
  return (
    <Link
      {...props}
      className={className}
      onClick={() => saveListContext(context, contextUrl)}
    >
      {children}
    </Link>
  )
}
