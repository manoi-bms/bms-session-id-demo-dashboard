// =============================================================================
// BMS Session KPI Dashboard - Age Group Distribution Chart (T072)
// Vertical bar chart showing patient age group breakdown.
// =============================================================================

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AgeGroupDataItem {
  group: string
  count: number
}

interface AgeGroupChartProps {
  data: AgeGroupDataItem[]
  isLoading: boolean
  className?: string
}

// ---------------------------------------------------------------------------
// Desired display order
// ---------------------------------------------------------------------------

const AGE_GROUP_ORDER = [
  'Infant',
  'Child',
  'Teenager',
  'Young Adult',
  'Middle Age',
  'Senior',
]

// ---------------------------------------------------------------------------
// Custom Tooltip
// ---------------------------------------------------------------------------

interface TooltipPayloadEntry {
  name: string
  value: number
  payload: { group: string; count: number }
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: TooltipPayloadEntry[]
}) {
  if (!active || !payload || payload.length === 0) return null

  const entry = payload[0]
  return (
    <div className="rounded-lg border bg-background p-3 shadow-sm">
      <p className="text-sm font-medium">{entry.payload.group}</p>
      <p className="text-sm text-muted-foreground">
        Count: {entry.value.toLocaleString()}
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AgeGroupChart({
  data,
  isLoading,
  className,
}: AgeGroupChartProps) {
  if (isLoading) {
    return (
      <div className={cn('space-y-2', className)}>
        <Skeleton className="h-[300px] w-full" />
      </div>
    )
  }

  if (!data || data.length === 0) {
    return <EmptyState title="No age group data available" />
  }

  // Sort according to the canonical age-group order
  const sortedData = [...data].sort((a, b) => {
    const ia = AGE_GROUP_ORDER.indexOf(a.group)
    const ib = AGE_GROUP_ORDER.indexOf(b.group)
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib)
  })

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={sortedData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="group"
            tick={{ fontSize: 12 }}
            className="text-muted-foreground"
          />
          <YAxis
            tick={{ fontSize: 12 }}
            className="text-muted-foreground"
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="count"
            fill="hsl(var(--chart-4))"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
