export interface BreadcrumbItem {
  label: string
  href?: string
}

interface CreateBreadcrumbFactoryOptions {
  parents?: BreadcrumbItem[]
  module: BreadcrumbItem
}

export function buildSettingsBreadcrumbParents(settingsLabel: string, sectionLabel?: string): BreadcrumbItem[] {
  return sectionLabel
    ? [{ label: settingsLabel }, { label: sectionLabel }]
    : [{ label: settingsLabel }]
}

export function createBreadcrumbFactory({
  parents = [],
  module,
}: CreateBreadcrumbFactoryOptions) {
  const moduleItem: BreadcrumbItem = { label: module.label }
  const linkedModuleItem: BreadcrumbItem = module.href ? module : moduleItem

  return {
    list(): BreadcrumbItem[] {
      return [...parents, moduleItem]
    },

    current(currentLabel: string): BreadcrumbItem[] {
      return [...parents, linkedModuleItem, { label: currentLabel }]
    },

    append(items: BreadcrumbItem[]): BreadcrumbItem[] {
      if (items.length === 0) {
        return [...parents, moduleItem]
      }

      return [...parents, linkedModuleItem, ...items]
    },
  }
}
