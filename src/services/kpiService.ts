// =============================================================================
// BMS Session KPI Dashboard - KPI Data Fetching Service
// (T042 + T053 + T062 + T070)
// Centralized service for all KPI queries across Overview, Trends,
// Departments/Doctors, and Demographics user stories.
// =============================================================================

import type {
  ConnectionConfig,
  DatabaseType,
  DepartmentWorkload,
  DoctorWorkload,
  HourlyDistribution,
  KpiSummary,
  OverviewStats,
  PatientTypeDistribution,
  RecentVisit,
  SqlApiResponse,
  VisitTrend,
} from '@/types';

import { queryBuilder } from '@/services/queryBuilder';
import { executeSqlViaApi } from '@/services/bmsSession';

// ---------------------------------------------------------------------------
// Response parsing helper
// ---------------------------------------------------------------------------

/**
 * Map raw {@link SqlApiResponse} rows into a typed array using the supplied
 * mapper function.
 *
 * Returns an empty array when the response contains no data rows.
 */
function parseQueryResponse<T>(
  response: SqlApiResponse,
  mapper: (row: Record<string, unknown>) => T,
): T[] {
  if (!response.data || !Array.isArray(response.data)) {
    return [];
  }
  return response.data.map(mapper);
}

// ---------------------------------------------------------------------------
// US1 - Overview KPIs
// ---------------------------------------------------------------------------

/**
 * Count of OPD visits for today.
 */
export async function getOpdVisitCount(
  config: ConnectionConfig,
  dbType: DatabaseType,
): Promise<number> {
  const sql = `SELECT COUNT(*) as total FROM ovst WHERE vstdate = ${queryBuilder.currentDate(dbType)}`;
  const response = await executeSqlViaApi(sql, config);
  const rows = parseQueryResponse(response, (row) => Number(row['total'] ?? 0));
  return rows[0] ?? 0;
}

/**
 * Count of currently admitted IPD patients (not yet discharged).
 *
 * The query is identical for MySQL and PostgreSQL.
 */
export async function getIpdPatientCount(
  config: ConnectionConfig,
): Promise<number> {
  const sql = `SELECT COUNT(*) as total FROM ipt WHERE dchdate IS NULL`;
  const response = await executeSqlViaApi(sql, config);
  const rows = parseQueryResponse(response, (row) => Number(row['total'] ?? 0));
  return rows[0] ?? 0;
}

/**
 * Count of ER visits for today.
 */
export async function getErVisitCount(
  config: ConnectionConfig,
  dbType: DatabaseType,
): Promise<number> {
  const sql = `SELECT COUNT(*) as total FROM er_regist WHERE vstdate = ${queryBuilder.currentDate(dbType)}`;
  const response = await executeSqlViaApi(sql, config);
  const rows = parseQueryResponse(response, (row) => Number(row['total'] ?? 0));
  return rows[0] ?? 0;
}

/**
 * Count of distinct departments with visits today.
 */
export async function getActiveDepartmentCount(
  config: ConnectionConfig,
  dbType: DatabaseType,
): Promise<number> {
  const sql =
    `SELECT COUNT(DISTINCT k.depcode) as total ` +
    `FROM ovst o LEFT JOIN kskdepartment k ON o.cur_dep = k.depcode ` +
    `WHERE o.vstdate = ${queryBuilder.currentDate(dbType)}`;
  const response = await executeSqlViaApi(sql, config);
  const rows = parseQueryResponse(response, (row) => Number(row['total'] ?? 0));
  return rows[0] ?? 0;
}

/**
 * Per-department visit counts for today, ordered by volume descending.
 */
export async function getDepartmentWorkload(
  config: ConnectionConfig,
  dbType: DatabaseType,
): Promise<DepartmentWorkload[]> {
  const sql =
    `SELECT k.depcode as department_code, k.department as department_name, COUNT(*) as visit_count ` +
    `FROM ovst o LEFT JOIN kskdepartment k ON o.cur_dep = k.depcode ` +
    `WHERE o.vstdate = ${queryBuilder.currentDate(dbType)} ` +
    `GROUP BY k.depcode, k.department ` +
    `ORDER BY visit_count DESC`;
  const response = await executeSqlViaApi(sql, config);
  return parseQueryResponse(response, (row) => ({
    departmentCode: String(row['department_code'] ?? ''),
    departmentName: String(row['department_name'] ?? ''),
    visitCount: Number(row['visit_count'] ?? 0),
  }));
}

/**
 * Aggregate overview KPI summary (all four counts fetched in parallel).
 */
export async function getKpiSummary(
  config: ConnectionConfig,
  dbType: DatabaseType,
): Promise<KpiSummary> {
  const [opdVisitCount, ipdPatientCount, erVisitCount, activeDepartmentCount] =
    await Promise.all([
      getOpdVisitCount(config, dbType),
      getIpdPatientCount(config),
      getErVisitCount(config, dbType),
      getActiveDepartmentCount(config, dbType),
    ]);

  return {
    opdVisitCount,
    ipdPatientCount,
    erVisitCount,
    activeDepartmentCount,
    timestamp: new Date(),
  };
}

// ---------------------------------------------------------------------------
// US2 - Trend KPIs
// ---------------------------------------------------------------------------

/**
 * Daily visit counts grouped by date within the given range.
 */
export async function getDailyVisitTrend(
  config: ConnectionConfig,
  dbType: DatabaseType,
  startDate: string,
  endDate: string,
): Promise<VisitTrend[]> {
  const dateExpr = queryBuilder.dateFormat(dbType, 'vstdate', '%Y-%m-%d');
  const sql =
    `SELECT ${dateExpr} as visit_date, COUNT(*) as visit_count ` +
    `FROM ovst ` +
    `WHERE vstdate >= '${startDate}' AND vstdate <= '${endDate}' ` +
    `GROUP BY ${dateExpr} ` +
    `ORDER BY visit_date ASC`;
  const response = await executeSqlViaApi(sql, config);
  return parseQueryResponse(response, (row) => ({
    date: String(row['visit_date'] ?? ''),
    visitCount: Number(row['visit_count'] ?? 0),
  }));
}

/**
 * Hourly visit distribution for a single date.
 */
export async function getHourlyDistribution(
  config: ConnectionConfig,
  dbType: DatabaseType,
  date: string,
): Promise<HourlyDistribution[]> {
  const hourExpr = queryBuilder.hourExtract(dbType, 'vsttime');
  const sql =
    `SELECT ${hourExpr} as visit_hour, COUNT(*) as visit_count ` +
    `FROM ovst ` +
    `WHERE vstdate = '${date}' ` +
    `GROUP BY ${hourExpr} ` +
    `ORDER BY visit_hour ASC`;
  const response = await executeSqlViaApi(sql, config);
  return parseQueryResponse(response, (row) => ({
    hour: Number(row['visit_hour'] ?? 0),
    visitCount: Number(row['visit_count'] ?? 0),
  }));
}

// ---------------------------------------------------------------------------
// US3 - Department / Doctor KPIs
// ---------------------------------------------------------------------------

/**
 * Department-level visit breakdown for a date range.
 */
export async function getDepartmentBreakdown(
  config: ConnectionConfig,
  _dbType: DatabaseType,
  startDate: string,
  endDate: string,
): Promise<DepartmentWorkload[]> {
  const sql =
    `SELECT k.depcode as department_code, k.department as department_name, COUNT(*) as visit_count ` +
    `FROM ovst o LEFT JOIN kskdepartment k ON o.cur_dep = k.depcode ` +
    `WHERE o.vstdate >= '${startDate}' AND o.vstdate <= '${endDate}' ` +
    `GROUP BY k.depcode, k.department ` +
    `ORDER BY visit_count DESC`;
  const response = await executeSqlViaApi(sql, config);
  return parseQueryResponse(response, (row) => ({
    departmentCode: String(row['department_code'] ?? ''),
    departmentName: String(row['department_name'] ?? ''),
    visitCount: Number(row['visit_count'] ?? 0),
  }));
}

/**
 * Doctor workload (patient counts) for a date range, optionally filtered by
 * department. Results are capped at 50 rows.
 */
export async function getDoctorWorkload(
  config: ConnectionConfig,
  _dbType: DatabaseType,
  startDate: string,
  endDate: string,
  depcode?: string,
): Promise<DoctorWorkload[]> {
  const depFilter = depcode
    ? ` AND o.cur_dep = '${depcode}'`
    : '';
  const sql =
    `SELECT o.doctor as doctor_code, d.name as doctor_name, COUNT(*) as patient_count ` +
    `FROM ovst o LEFT JOIN doctor d ON o.doctor = d.code ` +
    `WHERE o.vstdate >= '${startDate}' AND o.vstdate <= '${endDate}'${depFilter} ` +
    `GROUP BY o.doctor, d.name ` +
    `ORDER BY patient_count DESC ` +
    `LIMIT 50`;
  const response = await executeSqlViaApi(sql, config);
  return parseQueryResponse(response, (row) => ({
    doctorCode: String(row['doctor_code'] ?? ''),
    doctorName: String(row['doctor_name'] ?? ''),
    patientCount: Number(row['patient_count'] ?? 0),
  }));
}

/**
 * Daily visit trend for a specific department within a date range.
 */
export async function getDepartmentDailyTrend(
  config: ConnectionConfig,
  dbType: DatabaseType,
  depcode: string,
  startDate: string,
  endDate: string,
): Promise<VisitTrend[]> {
  const dateExpr = queryBuilder.dateFormat(dbType, 'o.vstdate', '%Y-%m-%d');
  const sql =
    `SELECT ${dateExpr} as visit_date, COUNT(*) as visit_count ` +
    `FROM ovst o ` +
    `WHERE o.vstdate >= '${startDate}' AND o.vstdate <= '${endDate}' ` +
    `AND o.cur_dep = '${depcode}' ` +
    `GROUP BY ${dateExpr} ` +
    `ORDER BY visit_date ASC`;
  const response = await executeSqlViaApi(sql, config);
  return parseQueryResponse(response, (row) => ({
    date: String(row['visit_date'] ?? ''),
    visitCount: Number(row['visit_count'] ?? 0),
  }));
}

// ---------------------------------------------------------------------------
// US4 - Demographics KPIs
// ---------------------------------------------------------------------------

/**
 * Gender distribution for visits within a date range.
 *
 * Attempts the `patient` table first. If the result set is empty (e.g. the
 * table is not populated), falls back to `ovst_patient_record`.
 */
export async function getGenderDistribution(
  config: ConnectionConfig,
  _dbType: DatabaseType,
  startDate: string,
  endDate: string,
): Promise<{ gender: string; count: number; dataSource: 'patient' | 'ovst_patient_record' }[]> {
  // Try patient table first
  const patientCountSql =
    `SELECT COUNT(*) as total ` +
    `FROM ovst o INNER JOIN patient p ON o.hn = p.hn ` +
    `WHERE o.vstdate >= '${startDate}' AND o.vstdate <= '${endDate}'`;
  const countResponse = await executeSqlViaApi(patientCountSql, config);
  const totalRows = parseQueryResponse(countResponse, (row) => Number(row['total'] ?? 0));
  const patientCount = totalRows[0] ?? 0;

  if (patientCount > 0) {
    const sql =
      `SELECT p.sex as gender, COUNT(*) as count ` +
      `FROM ovst o INNER JOIN patient p ON o.hn = p.hn ` +
      `WHERE o.vstdate >= '${startDate}' AND o.vstdate <= '${endDate}' ` +
      `GROUP BY p.sex ` +
      `ORDER BY count DESC`;
    const response = await executeSqlViaApi(sql, config);
    return parseQueryResponse(response, (row) => ({
      gender: String(row['gender'] ?? ''),
      count: Number(row['count'] ?? 0),
      dataSource: 'patient' as const,
    }));
  }

  // Fallback to ovst_patient_record
  const fallbackSql =
    `SELECT opr.sex as gender, COUNT(*) as count ` +
    `FROM ovst o INNER JOIN ovst_patient_record opr ON o.vn = opr.vn ` +
    `WHERE o.vstdate >= '${startDate}' AND o.vstdate <= '${endDate}' ` +
    `GROUP BY opr.sex ` +
    `ORDER BY count DESC`;
  const fallbackResponse = await executeSqlViaApi(fallbackSql, config);
  return parseQueryResponse(fallbackResponse, (row) => ({
    gender: String(row['gender'] ?? ''),
    count: Number(row['count'] ?? 0),
    dataSource: 'ovst_patient_record' as const,
  }));
}

/**
 * Age group distribution for visits within a date range.
 *
 * Groups: Infant (<1), Child (<13), Teenager (<20), Young Adult (<40),
 * Middle Age (<60), Senior (>=60).
 *
 * Uses {@link queryBuilder.ageCalc} to handle MySQL vs PostgreSQL age
 * calculation differences.
 */
export async function getAgeGroupDistribution(
  config: ConnectionConfig,
  dbType: DatabaseType,
  startDate: string,
  endDate: string,
): Promise<{ group: string; count: number }[]> {
  const age = queryBuilder.ageCalc(dbType, 'p.birthday');
  const sql =
    `SELECT ` +
    `CASE ` +
    `  WHEN ${age} < 1 THEN 'Infant' ` +
    `  WHEN ${age} < 13 THEN 'Child' ` +
    `  WHEN ${age} < 20 THEN 'Teenager' ` +
    `  WHEN ${age} < 40 THEN 'Young Adult' ` +
    `  WHEN ${age} < 60 THEN 'Middle Age' ` +
    `  ELSE 'Senior' ` +
    `END as age_group, ` +
    `COUNT(*) as count ` +
    `FROM ovst o INNER JOIN patient p ON o.hn = p.hn ` +
    `WHERE o.vstdate >= '${startDate}' AND o.vstdate <= '${endDate}' ` +
    `AND p.birthday IS NOT NULL ` +
    `GROUP BY age_group ` +
    `ORDER BY count DESC`;
  const response = await executeSqlViaApi(sql, config);
  return parseQueryResponse(response, (row) => ({
    group: String(row['age_group'] ?? ''),
    count: Number(row['count'] ?? 0),
  }));
}

/**
 * Patient type (pttype) distribution for visits within a date range.
 */
export async function getPatientTypeDistribution(
  config: ConnectionConfig,
  _dbType: DatabaseType,
  startDate: string,
  endDate: string,
): Promise<PatientTypeDistribution[]> {
  const sql =
    `SELECT o.pttype as pttype_code, pt.name as pttype_name, COUNT(*) as visit_count ` +
    `FROM ovst o LEFT JOIN pttype pt ON o.pttype = pt.pttype ` +
    `WHERE o.vstdate >= '${startDate}' AND o.vstdate <= '${endDate}' ` +
    `GROUP BY o.pttype, pt.name ` +
    `ORDER BY visit_count DESC`;
  const response = await executeSqlViaApi(sql, config);
  return parseQueryResponse(response, (row) => ({
    pttypeCode: String(row['pttype_code'] ?? ''),
    pttypeName: String(row['pttype_name'] ?? ''),
    visitCount: Number(row['visit_count'] ?? 0),
  }));
}

// ---------------------------------------------------------------------------
// Overview - Extended Stats & Recent Activity
// ---------------------------------------------------------------------------

/**
 * Get recent visits (last 10) with department and doctor names.
 */
export async function getRecentVisits(
  config: ConnectionConfig,
  dbType: DatabaseType,
): Promise<RecentVisit[]> {
  const sql =
    `SELECT o.vn, o.hn, ` +
    `${queryBuilder.dateFormat(dbType, 'o.vstdate', '%Y-%m-%d')} as vstdate, ` +
    `CAST(o.vsttime AS CHAR) as vsttime, ` +
    `COALESCE(k.department, 'Unknown') as department_name, ` +
    `COALESCE(d.name, 'Unknown') as doctor_name ` +
    `FROM ovst o ` +
    `LEFT JOIN kskdepartment k ON o.cur_dep = k.depcode ` +
    `LEFT JOIN doctor d ON o.doctor = d.code ` +
    `ORDER BY o.vstdate DESC, o.vsttime DESC ` +
    `LIMIT 10`;
  const response = await executeSqlViaApi(sql, config);
  return parseQueryResponse(response, (row) => ({
    vn: String(row['vn'] ?? ''),
    hn: String(row['hn'] ?? ''),
    vstdate: String(row['vstdate'] ?? ''),
    vsttime: String(row['vsttime'] ?? ''),
    departmentName: String(row['department_name'] ?? 'Unknown'),
    doctorName: String(row['doctor_name'] ?? 'Unknown'),
  }));
}

/**
 * Get overview statistics for the dashboard.
 */
export async function getOverviewStats(
  config: ConnectionConfig,
  dbType: DatabaseType,
): Promise<OverviewStats> {
  // Use simpler approach - run individual queries
  const queries = [
    // Total registered patients (from ovst_patient_record distinct hn)
    `SELECT COUNT(DISTINCT hn) as total FROM ovst_patient_record`,
    // Total visits this month
    `SELECT COUNT(*) as total FROM ovst WHERE ${queryBuilder.dateFormat(dbType, 'vstdate', '%Y-%m')} = ${queryBuilder.dateFormat(dbType, queryBuilder.currentDate(dbType), '%Y-%m')}`,
    // Total visits last month - use a date range approach
    `SELECT COUNT(*) as total FROM ovst WHERE vstdate >= ${queryBuilder.dateSubtract(dbType, 60)} AND vstdate < ${queryBuilder.dateSubtract(dbType, 30)}`,
    // Total active doctors
    `SELECT COUNT(*) as total FROM doctor WHERE active = 'Y' OR active IS NULL`,
    // Total departments
    `SELECT COUNT(*) as total FROM kskdepartment`,
  ];

  const results = await Promise.all(
    queries.map(sql => executeSqlViaApi(sql, config).then(r => {
      const rows = parseQueryResponse(r, (row) => Number(row['total'] ?? 0));
      return rows[0] ?? 0;
    }).catch(() => 0))
  );

  const totalVisitsThisMonth = results[1];
  const daysInMonth = new Date().getDate();

  return {
    totalRegisteredPatients: results[0],
    totalVisitsThisMonth: results[1],
    totalVisitsLastMonth: results[2],
    avgDailyVisitsThisMonth: daysInMonth > 0 ? Math.round(totalVisitsThisMonth / daysInMonth) : 0,
    totalDoctors: results[3],
    totalDepartments: results[4],
  };
}

/**
 * Get visit counts for the last 7 days as a mini trend.
 */
export async function getWeeklyMiniTrend(
  config: ConnectionConfig,
  dbType: DatabaseType,
): Promise<VisitTrend[]> {
  const sql =
    `SELECT ${queryBuilder.dateFormat(dbType, 'vstdate', '%Y-%m-%d')} as visit_date, COUNT(*) as visit_count ` +
    `FROM ovst ` +
    `WHERE vstdate >= ${queryBuilder.dateSubtract(dbType, 7)} ` +
    `GROUP BY ${queryBuilder.dateFormat(dbType, 'vstdate', '%Y-%m-%d')} ` +
    `ORDER BY visit_date`;
  const response = await executeSqlViaApi(sql, config);
  return parseQueryResponse(response, (row) => ({
    date: String(row['visit_date'] ?? ''),
    visitCount: Number(row['visit_count'] ?? 0),
  }));
}

/**
 * Get top 5 doctors by patient count for the current month.
 */
export async function getTopDoctorsThisMonth(
  config: ConnectionConfig,
  dbType: DatabaseType,
): Promise<DoctorWorkload[]> {
  const sql =
    `SELECT o.doctor as doctor_code, d.name as doctor_name, COUNT(*) as patient_count ` +
    `FROM ovst o ` +
    `LEFT JOIN doctor d ON o.doctor = d.code ` +
    `WHERE ${queryBuilder.dateFormat(dbType, 'o.vstdate', '%Y-%m')} = ${queryBuilder.dateFormat(dbType, queryBuilder.currentDate(dbType), '%Y-%m')} ` +
    `GROUP BY o.doctor, d.name ` +
    `ORDER BY patient_count DESC ` +
    `LIMIT 5`;
  const response = await executeSqlViaApi(sql, config);
  return parseQueryResponse(response, (row) => ({
    doctorCode: String(row['doctor_code'] ?? ''),
    doctorName: String(row['doctor_name'] ?? 'Unknown'),
    patientCount: Number(row['patient_count'] ?? 0),
  }));
}

// ---------------------------------------------------------------------------
// Trend Summary & Extended Trend KPIs
// ---------------------------------------------------------------------------

/**
 * Trend summary statistics for a date range.
 */
export interface TrendSummary {
  totalVisits: number
  avgDailyVisits: number
  peakDay: { date: string; count: number } | null
  lowestDay: { date: string; count: number } | null
  totalDays: number
  daysWithVisits: number
}

export function computeTrendSummary(trends: VisitTrend[]): TrendSummary {
  if (trends.length === 0) {
    return { totalVisits: 0, avgDailyVisits: 0, peakDay: null, lowestDay: null, totalDays: 0, daysWithVisits: 0 }
  }
  const totalVisits = trends.reduce((sum, t) => sum + t.visitCount, 0)
  const daysWithVisits = trends.filter(t => t.visitCount > 0).length
  const sorted = [...trends].sort((a, b) => b.visitCount - a.visitCount)
  return {
    totalVisits,
    avgDailyVisits: Math.round(totalVisits / trends.length),
    peakDay: sorted[0] ? { date: sorted[0].date, count: sorted[0].visitCount } : null,
    lowestDay: sorted[sorted.length - 1] ? { date: sorted[sorted.length - 1].date, count: sorted[sorted.length - 1].visitCount } : null,
    totalDays: trends.length,
    daysWithVisits,
  }
}

/**
 * Monthly visit summary for the last 6 months.
 */
export async function getMonthlyVisitSummary(
  config: ConnectionConfig,
  dbType: DatabaseType,
): Promise<{ month: string; visitCount: number }[]> {
  const monthExpr = queryBuilder.dateFormat(dbType, 'vstdate', '%Y-%m');
  const sql =
    `SELECT ${monthExpr} as visit_month, COUNT(*) as visit_count ` +
    `FROM ovst ` +
    `WHERE vstdate >= ${queryBuilder.dateSubtract(dbType, 180)} ` +
    `GROUP BY ${monthExpr} ` +
    `ORDER BY visit_month ASC`;
  const response = await executeSqlViaApi(sql, config);
  return parseQueryResponse(response, (row) => ({
    month: String(row['visit_month'] ?? ''),
    visitCount: Number(row['visit_count'] ?? 0),
  }));
}

/**
 * Visit counts by day of week for a date range.
 */
export async function getVisitsByDayOfWeek(
  config: ConnectionConfig,
  dbType: DatabaseType,
  startDate: string,
  endDate: string,
): Promise<{ dayOfWeek: number; dayName: string; visitCount: number }[]> {
  // Use day of week extraction - MySQL DAYOFWEEK (1=Sun..7=Sat), PostgreSQL EXTRACT(DOW) (0=Sun..6=Sat)
  const dowExpr = dbType === 'mysql'
    ? 'DAYOFWEEK(vstdate)'
    : "EXTRACT(DOW FROM vstdate)::int";
  const sql =
    `SELECT ${dowExpr} as day_of_week, COUNT(*) as visit_count ` +
    `FROM ovst ` +
    `WHERE vstdate >= '${startDate}' AND vstdate <= '${endDate}' ` +
    `GROUP BY ${dowExpr} ` +
    `ORDER BY day_of_week ASC`;
  const response = await executeSqlViaApi(sql, config);

  const dayNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

  return parseQueryResponse(response, (row) => {
    let dow = Number(row['day_of_week'] ?? 0);
    // MySQL: 1=Sun..7=Sat -> normalize to 0=Sun..6=Sat
    if (dbType === 'mysql') dow = dow - 1;
    return {
      dayOfWeek: dow,
      dayName: dayNames[dow] ?? `วัน ${dow}`,
      visitCount: Number(row['visit_count'] ?? 0),
    };
  });
}

/**
 * Top 5 departments by visit count for a date range.
 */
export async function getTopDepartmentsForRange(
  config: ConnectionConfig,
  _dbType: DatabaseType,
  startDate: string,
  endDate: string,
): Promise<DepartmentWorkload[]> {
  const sql =
    `SELECT k.depcode as department_code, k.department as department_name, COUNT(*) as visit_count ` +
    `FROM ovst o LEFT JOIN kskdepartment k ON o.cur_dep = k.depcode ` +
    `WHERE o.vstdate >= '${startDate}' AND o.vstdate <= '${endDate}' ` +
    `GROUP BY k.depcode, k.department ` +
    `ORDER BY visit_count DESC ` +
    `LIMIT 5`;
  const response = await executeSqlViaApi(sql, config);
  return parseQueryResponse(response, (row) => ({
    departmentCode: String(row['department_code'] ?? ''),
    departmentName: String(row['department_name'] ?? ''),
    visitCount: Number(row['visit_count'] ?? 0),
  }));
}
