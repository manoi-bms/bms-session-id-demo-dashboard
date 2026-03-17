// =============================================================================
// BMS Session KPI Dashboard - Doctor Workload Table Component (T064)
// =============================================================================

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { cn } from '@/lib/utils'
import type { DoctorWorkload } from '@/types'

interface DoctorTableProps {
  data: DoctorWorkload[]
  isLoading: boolean
  className?: string
}

export function DoctorTable({ data, isLoading, className }: DoctorTableProps) {
  // ---------------------------------------------------------------------------
  // Loading skeleton
  // ---------------------------------------------------------------------------
  if (isLoading) {
    return (
      <div className={cn(className)}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Doctor Name</TableHead>
              <TableHead className="text-right">Patient Count</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-6" /></TableCell>
                <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                <TableCell className="text-right"><Skeleton className="ml-auto h-4 w-12" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Empty state
  // ---------------------------------------------------------------------------
  if (!data || data.length === 0) {
    return (
      <div className={cn(className)}>
        <EmptyState
          title="No doctor data found for this period"
          description="Try selecting a different date range or department."
        />
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Data table
  // ---------------------------------------------------------------------------
  return (
    <div className={cn(className)}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">#</TableHead>
            <TableHead>Doctor Name</TableHead>
            <TableHead className="text-right">Patient Count</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((doctor, index) => (
            <TableRow key={doctor.doctorCode}>
              <TableCell className="font-medium">{index + 1}</TableCell>
              <TableCell>{doctor.doctorName || doctor.doctorCode}</TableCell>
              <TableCell className="text-right">
                {doctor.patientCount.toLocaleString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
