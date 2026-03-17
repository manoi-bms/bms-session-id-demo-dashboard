// =============================================================================
// BMS Session KPI Dashboard - Demographics & Insurance Page (T074 / US4)
// =============================================================================

import { useState, useCallback, useMemo } from 'react'
import { useBmsSessionContext } from '@/contexts/BmsSessionContext'
import { useQuery } from '@/hooks/useQuery'
import {
  getGenderDistribution,
  getAgeGroupDistribution,
  getPatientTypeDistribution,
} from '@/services/kpiService'
import { getDateRange } from '@/utils/dateUtils'
import { DateRangePicker } from '@/components/dashboard/DateRangePicker'
import { GenderChart } from '@/components/charts/GenderChart'
import { AgeGroupChart } from '@/components/charts/AgeGroupChart'
import { PatientTypeChart } from '@/components/charts/PatientTypeChart'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { PatientTypeDistribution } from '@/types'

// ---------------------------------------------------------------------------
// Types for service return values
// ---------------------------------------------------------------------------

type GenderData = Awaited<ReturnType<typeof getGenderDistribution>>
type AgeGroupData = Awaited<ReturnType<typeof getAgeGroupDistribution>>

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Demographics() {
  const { connectionConfig, session } = useBmsSessionContext()

  // Date range state — default to last 30 days
  const defaultRange = useMemo(() => getDateRange(30), [])
  const [startDate, setStartDate] = useState(defaultRange.startDate)
  const [endDate, setEndDate] = useState(defaultRange.endDate)

  const isConnected = connectionConfig !== null && session !== null

  // ----- Gender distribution query -----
  const genderQueryFn = useCallback(
    () =>
      getGenderDistribution(
        connectionConfig!,
        session!.databaseType,
        startDate,
        endDate,
      ),
    [connectionConfig, session, startDate, endDate],
  )

  const genderQuery = useQuery<GenderData>({
    queryFn: genderQueryFn,
    enabled: isConnected,
  })

  // ----- Age group distribution query -----
  const ageGroupQueryFn = useCallback(
    () =>
      getAgeGroupDistribution(
        connectionConfig!,
        session!.databaseType,
        startDate,
        endDate,
      ),
    [connectionConfig, session, startDate, endDate],
  )

  const ageGroupQuery = useQuery<AgeGroupData>({
    queryFn: ageGroupQueryFn,
    enabled: isConnected,
  })

  // ----- Patient type distribution query -----
  const patientTypeQueryFn = useCallback(
    () =>
      getPatientTypeDistribution(
        connectionConfig!,
        session!.databaseType,
        startDate,
        endDate,
      ),
    [connectionConfig, session, startDate, endDate],
  )

  const patientTypeQuery = useQuery<PatientTypeDistribution[]>({
    queryFn: patientTypeQueryFn,
    enabled: isConnected,
  })

  // ----- Date range handler -----
  const handleRangeChange = useCallback((start: string, end: string) => {
    setStartDate(start)
    setEndDate(end)
  }, [])

  const anyLoading =
    genderQuery.isLoading ||
    ageGroupQuery.isLoading ||
    patientTypeQuery.isLoading

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Demographics &amp; Insurance
        </h1>
        <p className="text-sm text-muted-foreground">
          Patient demographics and insurance type distribution
        </p>
      </div>

      {/* Date range picker */}
      <DateRangePicker
        startDate={startDate}
        endDate={endDate}
        onRangeChange={handleRangeChange}
        isLoading={anyLoading}
      />

      {/* Two-column grid: Gender + Age Group */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Gender Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <GenderChart
              data={genderQuery.data ?? []}
              isLoading={genderQuery.isLoading}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Age Group Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <AgeGroupChart
              data={ageGroupQuery.data ?? []}
              isLoading={ageGroupQuery.isLoading}
            />
          </CardContent>
        </Card>
      </div>

      {/* Full-width: Patient type / insurance distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Insurance Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <PatientTypeChart
            data={patientTypeQuery.data ?? []}
            isLoading={patientTypeQuery.isLoading}
          />
        </CardContent>
      </Card>
    </div>
  )
}
