export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-6">
      {/* 页面标题骨架 */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="h-10 w-32 bg-muted rounded" />
      </div>

      {/* 内容区骨架 */}
      <div className="bg-card rounded-lg border p-6 space-y-4">
        <div className="flex gap-4">
          <div className="h-10 w-64 bg-muted rounded" />
          <div className="h-10 w-32 bg-muted rounded" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-muted rounded" />
          ))}
        </div>
      </div>
    </div>
  )
}
