'use client'

import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { RoleLevelBadge } from './role-level-badge'
import { MoreHorizontal, Eye, Pencil, Trash2, Shield } from 'lucide-react'

interface Role {
  id: string
  roleCode: string
  roleName: string
  description: string | null
  roleLevel: number
  isSystem: boolean
  isActive: boolean
  createdAt: Date | string
  _count: {
    userRoles: number
    rolePermissions: number
  }
}

interface RoleTableProps {
  roles: Role[]
  onDelete?: (role: Role) => void
}

export function RoleTable({ roles, onDelete }: RoleTableProps) {
  const t = useTranslations('role')
  const tCommon = useTranslations('common')
  const router = useRouter()

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('code')}</TableHead>
            <TableHead>{t('name')}</TableHead>
            <TableHead>{t('level')}</TableHead>
            <TableHead>{t('permissionCount')}</TableHead>
            <TableHead>{t('userCount')}</TableHead>
            <TableHead>{t('isSystem')}</TableHead>
            <TableHead className="text-right">{tCommon('actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {roles.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                {tCommon('noData')}
              </TableCell>
            </TableRow>
          ) : (
            roles.map((role) => (
              <TableRow key={role.id}>
                <TableCell className="font-mono text-sm">{role.roleCode}</TableCell>
                <TableCell className="font-medium">{role.roleName}</TableCell>
                <TableCell>
                  <RoleLevelBadge level={role.roleLevel} />
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="gap-1">
                    <Shield className="h-3 w-3" />
                    {role._count.rolePermissions}
                  </Badge>
                </TableCell>
                <TableCell>{role._count.userRoles}</TableCell>
                <TableCell>
                  {role.isSystem ? (
                    <Badge variant="secondary">{t('isSystem')}</Badge>
                  ) : null}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => router.push(`/roles/${role.id}`)}>
                        <Eye className="mr-2 h-4 w-4" />
                        {tCommon('view')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push(`/roles/${role.id}/edit`)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        {tCommon('edit')}
                      </DropdownMenuItem>
                      {!role.isSystem && (
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => onDelete?.(role)}
                          disabled={role._count.userRoles > 0}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {tCommon('delete')}
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
