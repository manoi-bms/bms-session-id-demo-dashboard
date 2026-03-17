// =============================================================================
// BMS Session KPI Dashboard - Gender Distribution Chart (T071)
// Donut chart showing gender breakdown of patient visits.
// =============================================================================

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GenderDataItem {
  gender: string
  count: number
  dataSource?: 'patient' | 'ovst_patient_record'
}

interface GenderChartProps {
  data: GenderDataItem[]
  isLoading: boolean
  className?: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GENDER_LABELS: Record<string, string> = {
  '1': 'Male',
  '2': 'Female',
  M: 'Male',
  F: 'Female',
  male: 'Male',
  female: 'Female',
}

const GENDER_COLORS: Record<string, string> = {
  Male: 'hsl(var(--chart-1))',
  Female: 'hsl(var(--chart-2))',
}

const DEFAULT_COLOR = 'hsl(var(--chart-4))'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normaliseGenderLabel(raw: string): string {
  return GENDER_LABELS[raw] ?? GENDER_LABELS[raw.toLowerCase()] ?? (raw || 'Other')
}

function getGenderColor(label: string): string {
  return GENDER_COLORS[label] ?? DEFAULT_COLOR
}

// ---------------------------------------------------------------------------
// Custom Tooltip
// ---------------------------------------------------------------------------

interface TooltipPayloadEntry {
  name: string
  value: number
  payload: { name: string; value: number; percentage: number }
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
      <p className="text-sm font-medium">{entry.payload.name}</p>
      <p className="text-sm text-muted-foreground">
        Count: {entry.value.toLocaleString()}
      </p>
      <p className="text-sm text-muted-foreground">
        {entry.payload.percentage.toFixed(1)}%
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GenderChart({ data, isLoading, className }: GenderChartProps) {
  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center', className)}>
        <Skeleton className="h-[200px] w-[200px] rounded-full" />
      </div>
    )
  }

  if (!data || data.length === 0) {
    return <EmptyState title="No demographic data available" />
  }

  // Normalise labels and compute percentages
  const total = data.reduce((sum, d) => sum + d.count, 0)
  const chartData = data.map((d) => {
    const name = normaliseGenderLabel(d.gender)
    return {
      name,
      value: d.count,
      percentage: total > 0 ? (d.count / total) * 100 : 0,
    }
  })

  const allFromVisitRecords = data.every(
    (d) => d.dataSource === 'ovst_patient_record',
  )

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
          >
            {chartData.map((entry) => (
              <Cell
                key={entry.name}
                fill={getGenderColor(entry.name)}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend verticalAlign="bottom" />
        </PieChart>
      </ResponsiveContainer>
      {allFromVisitRecords && (
        <Badge variant="secondary" className="mt-2">
          Data from visit records
        </Badge>
      )}
    </div>
  )
}
