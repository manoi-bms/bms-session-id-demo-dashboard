// =============================================================================
// BMS Session KPI Dashboard - Department Horizontal Bar Chart (T063)
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
import type { DepartmentWorkload } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { cn } from '@/lib/utils'

interface DepartmentChartProps {
  data: DepartmentWorkload[]
  isLoading: boolean
  onDepartmentClick?: (depcode: string) => void
  className?: string
}

/**
 * Truncates long department names so they fit the Y-axis.
 */
function truncateName(name: string, maxLength = 20): string {
  if (name.length <= maxLength) return name
  return `${name.slice(0, maxLength)}...`
}

export function DepartmentChart({
  data,
  isLoading,
  onDepartmentClick,
  className,
}: DepartmentChartProps) {
  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------
  if (isLoading) {
    return (
      <Card className={cn(className)}>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Department Visit Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    )
  }

  // ---------------------------------------------------------------------------
  // Empty state
  // ---------------------------------------------------------------------------
  if (!data || data.length === 0) {
    return (
      <Card className={cn(className)}>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Department Visit Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState title="No department data available" />
        </CardContent>
      </Card>
    )
  }

  // ---------------------------------------------------------------------------
  // Chart
  // ---------------------------------------------------------------------------
  const chartHeight = Math.max(300, data.length * 40)

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Department Visit Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            onClick={(state: Record<string, unknown>) => {
              const activePayload = state?.activePayload as Array<{ payload: DepartmentWorkload }> | undefined
              if (activePayload?.[0]?.payload && onDepartmentClick) {
                onDepartmentClick(activePayload[0].payload.departmentCode)
              }
            }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              type="number"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey="departmentName"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={150}
              tickFormatter={(value: string) => truncateName(value)}
            />
            <Tooltip
              formatter={((value: unknown) => [Number(value).toLocaleString(), 'Visits']) as never}
              contentStyle={{
                borderRadius: '8px',
                border: '1px solid hsl(var(--border))',
                backgroundColor: 'hsl(var(--popover))',
                color: 'hsl(var(--popover-foreground))',
              }}
            />
            <Bar
              dataKey="visitCount"
              fill="hsl(var(--chart-3))"
              radius={[0, 4, 4, 0]}
              cursor="pointer"
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
