'use client'

import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createRoleSchema, type CreateRoleInput } from '@/lib/validations/role'

interface RoleFormProps {
  initialData?: Partial<CreateRoleInput>
  parentRoles?: { id: string; roleName: string; roleCode: string }[]
  onSubmit: (data: CreateRoleInput) => Promise<void>
  isLoading?: boolean
}

export function RoleForm({ initialData, parentRoles = [], onSubmit, isLoading }: RoleFormProps) {
  const t = useTranslations('role')
  const tCommon = useTranslations('common')

  const form = useForm<CreateRoleInput>({
    resolver: zodResolver(createRoleSchema),
    defaultValues: {
      roleCode: initialData?.roleCode || '',
      roleName: initialData?.roleName || '',
      description: initialData?.description || '',
      roleLevel: initialData?.roleLevel || 3,
      parentRoleId: initialData?.parentRoleId || null,
    },
  })

  const handleSubmit = async (data: CreateRoleInput) => {
    await onSubmit(data)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="roleCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('code')}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t('codePlaceholder')}
                    {...field}
                    disabled={!!initialData?.roleCode}
                  />
                </FormControl>
                <FormDescription>{t('codeHint')}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="roleName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('name')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('namePlaceholder')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="roleLevel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('level')}</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(parseInt(value))}
                  defaultValue={String(field.value)}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('levelPlaceholder')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="1">{t('roleLevels.1')}</SelectItem>
                    <SelectItem value="2">{t('roleLevels.2')}</SelectItem>
                    <SelectItem value="3">{t('roleLevels.3')}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="parentRoleId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('parentRole')}</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(value === 'none' ? null : value)}
                  defaultValue={field.value || 'none'}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('parentRolePlaceholder')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">无</SelectItem>
                    {parentRoles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.roleName} ({role.roleCode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('description')}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={t('descriptionPlaceholder')}
                  className="resize-none"
                  rows={3}
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? tCommon('loading') : tCommon('save')}
          </Button>
        </div>
      </form>
    </Form>
  )
}
