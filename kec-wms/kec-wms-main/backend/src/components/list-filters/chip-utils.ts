import type { AppliedFilterChip } from './applied-filter-chips'

export function compactAppliedFilterChips<T extends AppliedFilterChip>(
  chips: Array<T | null>
): T[] {
  return chips.filter((chip): chip is T => Boolean(chip))
}
