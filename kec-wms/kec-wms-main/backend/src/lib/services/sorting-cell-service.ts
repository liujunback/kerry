import { prisma } from '@/lib/db/prisma'

/**
 * 生成格口位置编码 (A1, A2, ..., B1, B2, ...)
 * @param horizontal 横向格口数
 * @param vertical 纵向格口数
 * @returns 格口位置编码数组
 */
export function generateCellPositions(horizontal: number, vertical: number): string[] {
  const positions: string[] = []
  for (let row = 0; row < vertical; row++) {
    const rowLetter = String.fromCharCode(65 + row) // A, B, C, ...
    for (let col = 1; col <= horizontal; col++) {
      positions.push(`${rowLetter}${col}`)
    }
  }
  return positions
}

/**
 * 为播种墙创建格口
 * @param sortingWallId 播种墙ID
 * @param wallCode 播种墙编码
 * @param warehouseId 仓库ID
 * @param tenantId 租户ID
 * @param horizontal 横向格口数
 * @param vertical 纵向格口数
 * @param userId 创建人ID
 */
export async function createCellsForWall(
  sortingWallId: string,
  wallCode: string,
  warehouseId: string,
  tenantId: string,
  horizontal: number,
  vertical: number,
  userId: string
): Promise<void> {
  const cellPositions = generateCellPositions(horizontal, vertical)
  const cellsToCreate = cellPositions.map((position, index) => {
    const rowNumber = Math.floor(index / horizontal) + 1
    const columnNumber = (index % horizontal) + 1
    return {
      tenantId,
      warehouseId,
      sortingWallId,
      cellCode: `${wallCode}-${position}`, // 格口编码：播种墙编码-格口位置
      cellPosition: position, // 格口位置：A1, A2, B1, B2...
      rowNumber,
      columnNumber,
      isActive: true,
      status: 'EMPTY',
      createdBy: userId,
      updatedBy: userId,
    }
  })

  await prisma.sortingCell.createMany({
    data: cellsToCreate,
  })
}

/**
 * 删除播种墙的所有格口
 * @param sortingWallId 播种墙ID
 */
export async function deleteCellsForWall(sortingWallId: string): Promise<void> {
  await prisma.sortingCell.deleteMany({
    where: { sortingWallId },
  })
}

/**
 * 检查播种墙是否有正在使用的格口
 * @param sortingWallId 播种墙ID
 * @returns 是否有正在使用的格口
 */
export async function hasActiveCells(sortingWallId: string): Promise<boolean> {
  const count = await prisma.sortingCell.count({
    where: {
      sortingWallId,
      status: { not: 'EMPTY' },
    },
  })
  return count > 0
}

/**
 * 获取播种墙的可用格口列表
 * @param sortingWallId 播种墙ID
 * @returns 可用格口列表
 */
export async function getAvailableCells(sortingWallId: string) {
  return await prisma.sortingCell.findMany({
    where: {
      sortingWallId,
      isActive: true,
      status: 'EMPTY',
    },
    orderBy: [
      { rowNumber: 'asc' },
      { columnNumber: 'asc' },
    ],
  })
}

/**
 * 更新格口状态
 * @param cellId 格口ID
 * @param status 新状态
 */
export async function updateCellStatus(cellId: string, status: string): Promise<void> {
  await prisma.sortingCell.update({
    where: { id: cellId },
    data: { status },
  })
}

/**
 * 批量重置格口状态为EMPTY
 * @param sortingWallId 播种墙ID
 */
export async function resetCellsStatus(sortingWallId: string): Promise<void> {
  await prisma.sortingCell.updateMany({
    where: { sortingWallId },
    data: { status: 'EMPTY' },
  })
}
