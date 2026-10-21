export abstract class BasePrinter {
  abstract print(pdfBuffer: Buffer, copies: number): Promise<void>
  abstract testConnection(): Promise<number> // 返回延迟 ms
}
