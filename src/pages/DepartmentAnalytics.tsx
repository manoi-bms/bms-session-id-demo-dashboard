// =============================================================================
// BMS Session KPI Dashboard - Department & Doctor Analytics Page (T065 / US3)
// =============================================================================

import { useState, useCallback } from 'react'
import { useBmsSessionContext } from '@/contexts/BmsSessionContext'
import { useQuery } from '@/hooks/useQuery'
import {
  getDepartmentBreakdown,
  getDoctorWorkload,
  getDepartmentDailyTrend,
} from '@/services/kpiService'
import { getDateRange } from '@/utils/dateUtils'
import { DateRangePicker } from '@/components/dashboard/DateRangePicker'
import { DepartmentChart } from '@/components/charts/DepartmentChart'
import { DoctorTable } from '@/components/dashboard/DoctorTable'
import { VisitTrendChart } from '@/components/charts/VisitTrendChart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { DepartmentWorkload, DoctorWorkload, VisitTrend } from '@/types'

export default function DepartmentAnalytics() {
  const { connectionConfig, session } = useBmsSessionContext()

  // ---------------------------------------------------------------------------
  // Date range state
  // ---------------------------------------------------------------------------
  const defaultRange = getDateRange(30)
  const [startDate, setStartDate] = useState(defaultRange.startDate)
  const [endDate, setEndDate] = useState(defaultRange.endDate)

  // ---------------------------------------------------------------------------
  // Selected department drill-down state
  // ---------------------------------------------------------------------------
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null)
  const [selectedDepartmentName, setSelectedDepartmentName] = useState<string>('')

  // ---------------------------------------------------------------------------
  // Department breakdown query
  // ---------------------------------------------------------------------------
  const departmentQueryFn = useCallback(
    () => getDepartmentBreakdown(connectionConfig!, session!.databaseType, startDate, endDate),
    [connectionConfig, session, startDate, endDate],
  )

  const {
    data: departments,
    isLoading: isDepartmentsLoading,
  } = useQuery<DepartmentWorkload[]>({
    queryFn: departmentQueryFn,
    enabled: connectionConfig !== null && session !== null,
  })

  // ---------------------------------------------------------------------------
  // Doctor workload query (filtered by selected department)
  // ---------------------------------------------------------------------------
  const doctorQueryFn = useCallback(
    () =>
      getDoctorWorkload(
        connectionConfig!,
        session!.databaseType,
        startDate,
        endDate,
        selectedDepartment ?? undefined,
      ),
    [connectionConfig, session, startDate, endDate, selectedDepartment],
  )

  const {
    data: doctors,
    isLoading: isDoctorsLoading,
  } = useQuery<DoctorWorkload[]>({
    queryFn: doctorQueryFn,
    enabled: connectionConfig !== null && session !== null && selectedDepartment !== null,
  })

  // ---------------------------------------------------------------------------
  // Department daily trend query (filtered by selected department)
  // ---------------------------------------------------------------------------
  const trendQueryFn = useCallback(
    () =>
      getDepartmentDailyTrend(
        connectionConfig!,
        session!.databaseType,
        selectedDepartment!,
        startDate,
        endDate,
      ),
    [connectionConfig, session, selectedDepartment, startDate, endDate],
  )

  const {
    data: trendData,
    isLoading: isTrendLoading,
  } = useQuery<VisitTrend[]>({
    queryFn: trendQueryFn,
    enabled: connectionConfig !== null && session !== null && selectedDepartment !== null,
  })

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handleRangeChange = useCallback((start: string, end: string) => {
    setStartDate(start)
    setEndDate(end)
    // Clear drill-down when date range changes
    setSelectedDepartment(null)
    setSelectedDepartmentName('')
  }, [])

  const handleDepartmentClick = useCallback(
    (depcode: string) => {
      setSelectedDepartment(depcode)
      // Find the department name from the loaded data
      const dept = departments?.find((d) => d.departmentCode === depcode)
      setSelectedDepartmentName(dept?.departmentName ?? depcode)
    },
    [departments],
  )

  const handleClearSelection = useCallback(() => {
    setSelectedDepartment(null)
    setSelectedDepartmentName('')
  }, [])

  // ---------------------------------------------------------------------------
  // Determine overall loading state for the date range picker
  // ---------------------------------------------------------------------------
  const isAnyLoading = isDepartmentsLoading || isDoctorsLoading || isTrendLoading

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Department Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Visit breakdown by department and doctor workload
        </p>
      </div>

      {/* Date range picker */}
      <DateRangePicker
        startDate={startDate}
        endDate={endDate}
        onRangeChange={handleRangeChange}
        isLoading={isAnyLoading}
      />

      {/* Department breakdown chart */}
      <DepartmentChart
        data={departments ?? []}
        isLoading={isDepartmentsLoading}
        onDepartmentClick={handleDepartmentClick}
      />

      {/* Drill-down section: shown when a department is selected */}
      {selectedDepartment && (
        <>
          {/* Selected department header */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-semibold">
                {selectedDepartmentName}
              </CardTitle>
              <Button variant="outline" size="sm" onClick={handleClearSelection}>
                Clear
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Showing doctor workload and daily trend for the selected department.
              </p>
            </CardContent>
          </Card>

          {/* Two-column responsive layout: Doctor table + Visit trend chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Doctor Workload</CardTitle>
              </CardHeader>
              <CardContent>
                <DoctorTable
                  data={doctors ?? []}
                  isLoading={isDoctorsLoading}
                />
              </CardContent>
            </Card>

            <VisitTrendChart
              data={trendData ?? []}
              isLoading={isTrendLoading}
            />
          </div>
        </>
      )}
    </div>
  )
}
