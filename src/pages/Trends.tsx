// =============================================================================
// BMS Session KPI Dashboard - Visit Trends Page (T057 / US2)
// Redesigned: Rich informative trends page with summary cards, day-of-week
// breakdown, top departments, monthly summary, and hourly drill-down.
// =============================================================================

import { useState, useCallback, useMemo } from 'react'
import { useBmsSessionContext } from '@/contexts/BmsSessionContext'
import { useQuery } from '@/hooks/useQuery'
import {
  getDailyVisitTrend,
  getHourlyDistribution,
  getMonthlyVisitSummary,
  getVisitsByDayOfWeek,
  getTopDepartmentsForRange,
  computeTrendSummary,
} from '@/services/kpiService'
import type { VisitTrend, HourlyDistribution, DepartmentWorkload } from '@/types'
import { DateRangePicker } from '@/components/dashboard/DateRangePicker'
import { VisitTrendChart } from '@/components/charts/VisitTrendChart'
import { HourlyChart } from '@/components/charts/HourlyChart'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { getDateRange } from '@/utils/dateUtils'
import { TrendingUp, BarChart3, ArrowUp, CalendarCheck } from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'

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

  const isReady = connectionConfig !== null && session !== null

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
  } = useQuery<VisitTrend[]>({
    queryFn: dailyQueryFn,
    enabled: isReady,
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
  } = useQuery<HourlyDistribution[]>({
    queryFn: hourlyQueryFn,
    enabled: isReady && selectedDate !== null,
  })

  // ---------------------------------------------------------------------------
  // Day-of-week visit query
  // ---------------------------------------------------------------------------
  const dowQueryFn = useCallback(
    () =>
      getVisitsByDayOfWeek(
        connectionConfig!,
        session!.databaseType,
        startDate,
        endDate,
      ),
    [connectionConfig, session, startDate, endDate],
  )

  const {
    data: dowData,
    isLoading: isDowLoading,
  } = useQuery<{ dayOfWeek: number; dayName: string; visitCount: number }[]>({
    queryFn: dowQueryFn,
    enabled: isReady,
  })

  // ---------------------------------------------------------------------------
  // Top departments for range
  // ---------------------------------------------------------------------------
  const topDeptsQueryFn = useCallback(
    () =>
      getTopDepartmentsForRange(
        connectionConfig!,
        session!.databaseType,
        startDate,
        endDate,
      ),
    [connectionConfig, session, startDate, endDate],
  )

  const {
    data: topDeptsData,
    isLoading: isTopDeptsLoading,
  } = useQuery<DepartmentWorkload[]>({
    queryFn: topDeptsQueryFn,
    enabled: isReady,
  })

  // ---------------------------------------------------------------------------
  // Monthly visit summary (last 6 months)
  // ---------------------------------------------------------------------------
  const monthlyQueryFn = useCallback(
    () =>
      getMonthlyVisitSummary(
        connectionConfig!,
        session!.databaseType,
      ),
    [connectionConfig, session],
  )

  const {
    data: monthlyData,
    isLoading: isMonthlyLoading,
  } = useQuery<{ month: string; visitCount: number }[]>({
    queryFn: monthlyQueryFn,
    enabled: isReady,
  })

  // ---------------------------------------------------------------------------
  // Computed trend summary
  // ---------------------------------------------------------------------------
  const trendSummary = useMemo(
    () => computeTrendSummary(dailyData ?? []),
    [dailyData],
  )

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handleRangeChange = useCallback(
    (newStart: string, newEnd: string) => {
      setStartDate(newStart)
      setEndDate(newEnd)
      setSelectedDate(null)
      resetHourly()
    },
    [resetHourly],
  )

  const handleDateClick = useCallback(
    (date: string) => {
      setSelectedDate(date)
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
  // Shared Recharts tooltip style
  // ---------------------------------------------------------------------------
  const tooltipStyle = {
    borderRadius: '8px',
    border: '1px solid hsl(var(--border))',
    backgroundColor: 'hsl(var(--popover))',
    color: 'hsl(var(--popover-foreground))',
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="flex flex-col gap-6">
      {/* ------------------------------------------------------------------ */}
      {/* 1. Header + DateRangePicker                                        */}
      {/* ------------------------------------------------------------------ */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          แนวโน้มการเข้ารับบริการ
        </h1>
        <p className="text-sm text-muted-foreground">
          วิเคราะห์จำนวนการเข้ารับบริการรายวัน รายสัปดาห์ และรายเดือน พร้อมสรุปแผนกยอดนิยม
        </p>
      </div>

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
            {dailyError.message || 'ไม่สามารถโหลดข้อมูลแนวโน้มได้'}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={refetchDaily}
          >
            ลองอีกครั้ง
          </Button>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 2. Trend Summary Cards                                             */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total visits */}
        <Card className="p-4">
          <CardContent className="p-0 flex items-center gap-3">
            {isDailyLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">
                    จำนวนการเข้ารับบริการทั้งหมด
                  </p>
                  <p className="text-xl font-bold">
                    {trendSummary.totalVisits.toLocaleString()}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Average daily */}
        <Card className="p-4">
          <CardContent className="p-0 flex items-center gap-3">
            {isDailyLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">
                    เฉลี่ยต่อวัน
                  </p>
                  <p className="text-xl font-bold">
                    {trendSummary.avgDailyVisits.toLocaleString()}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Peak day */}
        <Card className="p-4">
          <CardContent className="p-0 flex items-center gap-3">
            {isDailyLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                  <ArrowUp className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">
                    วันที่มีผู้เข้ารับบริการมากที่สุด
                  </p>
                  <p className="text-xl font-bold">
                    {trendSummary.peakDay
                      ? trendSummary.peakDay.count.toLocaleString()
                      : '-'}
                  </p>
                  {trendSummary.peakDay && (
                    <p className="text-xs text-muted-foreground">
                      {trendSummary.peakDay.date}
                    </p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Days with visits */}
        <Card className="p-4">
          <CardContent className="p-0 flex items-center gap-3">
            {isDailyLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                  <CalendarCheck className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">
                    จำนวนวันที่มีบริการ
                  </p>
                  <p className="text-xl font-bold">
                    {trendSummary.daysWithVisits} / {trendSummary.totalDays}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 3. Daily Visit Trend Chart                                         */}
      {/* ------------------------------------------------------------------ */}
      <VisitTrendChart
        data={dailyData ?? []}
        isLoading={isDailyLoading}
        onDateClick={handleDateClick}
      />

      {/* ------------------------------------------------------------------ */}
      {/* 4. Two-column: Day-of-week + Top departments                       */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Day of week breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              การเข้ารับบริการตามวันในสัปดาห์
            </CardTitle>
            <CardDescription>
              สรุปจำนวนผู้เข้ารับบริการแยกตามวันในสัปดาห์
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isDowLoading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : !dowData || dowData.length === 0 ? (
              <EmptyState title="ไม่มีข้อมูลแยกตามวัน" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={dowData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="dayName"
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
                    formatter={((value: unknown) => [Number(value).toLocaleString(), 'ครั้ง']) as never}
                    contentStyle={tooltipStyle}
                  />
                  <Bar
                    dataKey="visitCount"
                    fill="hsl(var(--chart-3))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top departments */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              แผนกยอดนิยม
            </CardTitle>
            <CardDescription>
              5 แผนกที่มีผู้เข้ารับบริการมากที่สุดในช่วงเวลาที่เลือก
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isTopDeptsLoading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : !topDeptsData || topDeptsData.length === 0 ? (
              <EmptyState title="ไม่มีข้อมูลแผนก" />
            ) : (
              <ResponsiveContainer
                width="100%"
                height={Math.max(200, topDeptsData.length * 50)}
              >
                <BarChart data={topDeptsData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <YAxis
                    dataKey="departmentName"
                    type="category"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={140}
                  />
                  <Tooltip
                    formatter={((value: unknown) => [Number(value).toLocaleString(), 'ครั้ง']) as never}
                    contentStyle={tooltipStyle}
                  />
                  <Bar
                    dataKey="visitCount"
                    fill="hsl(var(--chart-4))"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 5. Hourly drill-down (when a date is selected)                     */}
      {/* ------------------------------------------------------------------ */}
      {selectedDate && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">
                การกระจายรายชั่วโมงสำหรับ {selectedDate}
              </CardTitle>
              <Button variant="outline" size="sm" onClick={handleClearSelection}>
                ล้างการเลือก
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <HourlyChart
              data={hourlyData ?? []}
              isLoading={isHourlyLoading}
              selectedDate={selectedDate}
            />
          </CardContent>
        </Card>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 6. Monthly summary (last 6 months)                                 */}
      {/* ------------------------------------------------------------------ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            สรุปการเข้ารับบริการรายเดือน
          </CardTitle>
          <CardDescription>6 เดือนย้อนหลัง</CardDescription>
        </CardHeader>
        <CardContent>
          {isMonthlyLoading ? (
            <Skeleton className="h-[200px] w-full" />
          ) : !monthlyData || monthlyData.length === 0 ? (
            <EmptyState title="ไม่มีข้อมูลรายเดือน" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="month"
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
                  formatter={((value: unknown) => [Number(value).toLocaleString(), 'ครั้ง']) as never}
                  contentStyle={tooltipStyle}
                />
                <Bar
                  dataKey="visitCount"
                  fill="hsl(var(--chart-5))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
