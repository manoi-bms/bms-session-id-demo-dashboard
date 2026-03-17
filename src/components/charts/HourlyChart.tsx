// =============================================================================
// BMS Session KPI Dashboard - Hourly Distribution Chart Component (T055)
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
import type { HourlyDistribution } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { cn } from '@/lib/utils'

interface HourlyChartProps {
  data: HourlyDistribution[]
  isLoading: boolean
  selectedDate?: string
  className?: string
}

/**
 * Formats an hour number (0-23) as "HH:00".
 */
function formatHourLabel(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`
}

export function HourlyChart({
  data,
  isLoading,
  selectedDate,
  className,
}: HourlyChartProps) {
  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------
  if (isLoading) {
    return (
      <Card className={cn(className)}>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            {selectedDate
              ? `Hourly Distribution for ${selectedDate}`
              : 'Hourly Distribution'}
          </CardTitle>
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
          <CardTitle className="text-sm font-medium">
            {selectedDate
              ? `Hourly Distribution for ${selectedDate}`
              : 'Hourly Distribution'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState title="No hourly data for this date" />
        </CardContent>
      </Card>
    )
  }

  // ---------------------------------------------------------------------------
  // Chart
  // ---------------------------------------------------------------------------
  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle className="text-sm font-medium">
          {selectedDate
            ? `Hourly Distribution for ${selectedDate}`
            : 'Hourly Distribution'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="hour"
              tickFormatter={formatHourLabel}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              labelFormatter={((hour: unknown) => formatHourLabel(Number(hour))) as never}
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
              fill="hsl(var(--chart-2))"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
