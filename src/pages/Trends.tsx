// =============================================================================
// BMS Session KPI Dashboard - Visit Trends Page (T057 / US2)
// =============================================================================

import { useState, useCallback, useMemo } from 'react'
import { useBmsSessionContext } from '@/contexts/BmsSessionContext'
import { useQuery } from '@/hooks/useQuery'
import { getDailyVisitTrend, getHourlyDistribution } from '@/services/kpiService'
import { DateRangePicker } from '@/components/dashboard/DateRangePicker'
import { VisitTrendChart } from '@/components/charts/VisitTrendChart'
import { HourlyChart } from '@/components/charts/HourlyChart'
import { Button } from '@/components/ui/button'
import { getDateRange } from '@/utils/dateUtils'

export default function Trends() {
  const { connectionConfig, session } = useBmsSessionContext()

  // ---------------------------------------------------------------------------
  // Date range state (default: last 30 days)
  // ---------------------------------------------------------------------------
  const defaultRange = useMemo(() => getDateRange(30), [])
  const [startDate, setStartDate] = useState(defaultRange.startDate)
  const [endDate, setEndDate] = useState(defaultRange.endDate)

  // ---------------------------------------------------------------------------
  // Hourly drill-down state
  // ---------------------------------------------------------------------------
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  // ---------------------------------------------------------------------------
  // Daily visit trend query
  // ---------------------------------------------------------------------------
  const dailyQueryFn = useCallback(
    () =>
      getDailyVisitTrend(
        connectionConfig!,
        session!.databaseType,
        startDate,
        endDate,
      ),
    [connectionConfig, session, startDate, endDate],
  )

  const {
    data: dailyData,
    isLoading: isDailyLoading,
    isError: isDailyError,
    error: dailyError,
    execute: refetchDaily,
  } = useQuery<Awaited<ReturnType<typeof getDailyVisitTrend>>>({
    queryFn: dailyQueryFn,
    enabled: connectionConfig !== null && session !== null,
  })

  // ---------------------------------------------------------------------------
  // Hourly distribution query (triggered by bar click)
  // ---------------------------------------------------------------------------
  const hourlyQueryFn = useCallback(
    () =>
      getHourlyDistribution(
        connectionConfig!,
        session!.databaseType,
        selectedDate!,
      ),
    [connectionConfig, session, selectedDate],
  )

  const {
    data: hourlyData,
    isLoading: isHourlyLoading,
    execute: fetchHourly,
    reset: resetHourly,
  } = useQuery<Awaited<ReturnType<typeof getHourlyDistribution>>>({
    queryFn: hourlyQueryFn,
    enabled:
      connectionConfig !== null && session !== null && selectedDate !== null,
  })

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handleRangeChange = useCallback(
    (newStart: string, newEnd: string) => {
      setStartDate(newStart)
      setEndDate(newEnd)
      // Clear hourly drill-down when date range changes
      setSelectedDate(null)
      resetHourly()
    },
    [resetHourly],
  )

  const handleDateClick = useCallback(
    (date: string) => {
      setSelectedDate(date)
      // fetchHourly will be triggered by the useQuery enabled dependency
      // but we also call it explicitly in case selectedDate was already set
      // to the same value (re-click scenario)
      if (connectionConfig && session) {
        fetchHourly()
      }
    },
    [connectionConfig, session, fetchHourly],
  )

  const handleClearSelection = useCallback(() => {
    setSelectedDate(null)
    resetHourly()
  }, [resetHourly])

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Visit Trends</h1>
        <p className="text-sm text-muted-foreground">
          Daily visit counts and hourly distribution drill-down
        </p>
      </div>

      {/* Date range picker */}
      <DateRangePicker
        startDate={startDate}
        endDate={endDate}
        onRangeChange={handleRangeChange}
        isLoading={isDailyLoading}
      />

      {/* Error banner */}
      {isDailyError && dailyError && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            {dailyError.message || 'Failed to load visit trend data'}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={refetchDaily}
          >
            Retry
          </Button>
        </div>
      )}

      {/* Daily visit trend chart */}
      <VisitTrendChart
        data={dailyData ?? []}
        isLoading={isDailyLoading}
        onDateClick={handleDateClick}
      />

      {/* Hourly distribution (shown when a date is selected) */}
      {selectedDate && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Hourly Distribution for {selectedDate}
            </h2>
            <Button variant="outline" size="sm" onClick={handleClearSelection}>
              Clear selection
            </Button>
          </div>
          <HourlyChart
            data={hourlyData ?? []}
            isLoading={isHourlyLoading}
            selectedDate={selectedDate}
          />
        </div>
      )}
    </div>
  )
}
