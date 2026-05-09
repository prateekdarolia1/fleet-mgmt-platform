import { createClient } from '@supabase/supabase-js'
import ExcelJS from 'exceljs'

const SUPABASE_URL = 'https://kkxxnpfwvlbsqvmbirqa.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtreHhucGZ3dmxic3F2bWJpcnFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczOTQ2MDYsImV4cCI6MjA3Mjk3MDYwNn0.Z5JrrxfynbUkuoImR5mFaI1tIERkRRzMqj3Ncp0e02Q'

const OUTPUT_FILE = 'scripts/collections-report.xlsx'

const COLORS = {
  headerBg: 'FF1F4E79',
  headerFg: 'FFFFFFFF',
  bandBg: 'FFF2F6FB',
  totalBg: 'FFD9E2F3',
  totalBorder: 'FF1F4E79',
  titleBg: 'FF1F4E79',
  sectionBg: 'FFE7EEF7',
  positive: 'FF2E7D32',
  border: 'FFB4C7E7',
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

function parseDateOnly(s) {
  if (!s) return null
  // Expecting 'YYYY-MM-DD'. Treat as UTC noon to avoid TZ shifts.
  return new Date(`${s}T12:00:00Z`)
}

function addDays(date, days) {
  if (!date) return null
  const d = new Date(date)
  d.setUTCDate(d.getUTCDate() + days)
  return d
}

function fmtMode(m) {
  if (!m) return 'Unknown'
  return m
    .split('-')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ')
    .replace('Upi', 'UPI')
}

function fmtStatus(s) {
  if (!s) return '—'
  return s.charAt(0).toUpperCase() + s.slice(1)
}

async function fetchAll() {
  const PMT_COLS = `payment_id, rider_id, rider_name, amount, due_date, payment_date,
       payment_mode, upi_last4, collected_by, collected_at, ledger_id, notes`

  console.log('Fetching paid rental payments (UI source of truth)...')
  const { data: rentals, error: pErr } = await supabase
    .from('payments')
    .select(PMT_COLS)
    .eq('status', 'paid')
    .eq('payment_type', 'rental')
    .is('cancelled_at', null)
  if (pErr) throw new Error(`rentals fetch failed: ${pErr.message}`)
  console.log(`  -> ${rentals.length} paid rentals`)

  console.log('Fetching paid security deposits...')
  const { data: deposits, error: dErr } = await supabase
    .from('payments')
    .select(PMT_COLS)
    .eq('status', 'paid')
    .eq('payment_type', 'security_deposit')
    .is('cancelled_at', null)
  if (dErr) throw new Error(`deposits fetch failed: ${dErr.message}`)
  console.log(`  -> ${deposits.length} paid security deposits`)

  // Match dashboard logic (src/hooks/useUnifiedPayments.ts):
  //   Overdue       = status in (overdue, pending, partial) AND due_date < today-3d
  //   Due This Week = status in (pending, partial)          AND due_date in [today-3d, today+7d]
  // 3-day grace period to avoid pestering riders the moment a bill goes past due.
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const past3 = new Date(today); past3.setDate(past3.getDate() - 3)
  const fwd7 = new Date(today); fwd7.setDate(fwd7.getDate() + 7)
  const past3Str = past3.toISOString().slice(0, 10)
  const fwd7Str = fwd7.toISOString().slice(0, 10)

  const RP_COLS = `payment_id, week_number, due_date, amount_due, status,
                   ledger:rental_ledgers (id, rider_id, rider_name, vehicle_number, rental_start_date)`

  console.log(`Fetching overdue rentals (status in {overdue,pending,partial}, due < ${past3Str})...`)
  const { data: overdues, error: oErr } = await supabase
    .from('rental_payments')
    .select(RP_COLS)
    .in('status', ['overdue', 'pending', 'partial'])
    .lt('due_date', past3Str)
    .is('cancelled_at', null)
  if (oErr) throw new Error(`overdues fetch failed: ${oErr.message}`)
  console.log(`  -> ${overdues.length} overdue rentals`)

  console.log(`Fetching due-this-week rentals (status in {pending,partial}, due ${past3Str} → ${fwd7Str})...`)
  const { data: pendings, error: penErr } = await supabase
    .from('rental_payments')
    .select(RP_COLS)
    .in('status', ['pending', 'partial'])
    .gte('due_date', past3Str)
    .lte('due_date', fwd7Str)
    .is('cancelled_at', null)
  if (penErr) throw new Error(`pendings fetch failed: ${penErr.message}`)
  console.log(`  -> ${pendings.length} due-this-week rentals`)

  console.log('Fetching rental_payments for enrichment (all statuses)...')
  const { data: rentalPayments, error: rpErr } = await supabase
    .from('rental_payments')
    .select(
      `payment_id, week_number, due_date,
       ledger:rental_ledgers (id, vehicle_number, rental_start_date)`
    )
    .is('cancelled_at', null)
  if (rpErr) throw new Error(`rental_payments fetch failed: ${rpErr.message}`)
  console.log(`  -> ${rentalPayments.length} synced rental_payments`)

  const { data: riderLedgers } = await supabase
    .from('rider_ledgers')
    .select('id, rider_id, rental_start_date')
  const { data: rentalLedgers } = await supabase
    .from('rental_ledgers')
    .select('id, rider_id, rental_start_date, vehicle_number, status, created_at')
  const { data: riders } = await supabase
    .from('riders')
    .select('rider_id, name, status, duty_status, onboarded_by, vehicle_assigned')
  console.log(`  -> ${riders.length} riders, ${rentalLedgers.length} rental_ledgers, ${riderLedgers.length} rider_ledgers`)

  return {
    rentals, deposits, overdues, pendings,
    rentalPayments, riderLedgers, rentalLedgers, riders,
    today, horizonDate: fwd7,
  }
}

// Shared enrichment: derive week, period, vehicle for any rental payment_id
function enrichRentalPayment(p, ctx) {
  const { riderMap, rpMap, rlByIdMap, renByIdMap, renByRiderMap } = ctx
  const rider = riderMap.get(p.rider_id)
  const rp = rpMap.get(p.payment_id)

  let week = null
  let rentalStartDate = null
  let vehicleNumber = null

  if (rp?.ledger) {
    week = rp.week_number
    rentalStartDate = rp.ledger.rental_start_date
    vehicleNumber = rp.ledger.vehicle_number
  } else {
    if (p.ledger_id) {
      const rl = rlByIdMap.get(p.ledger_id)
      const ren = renByIdMap.get(p.ledger_id)
      if (ren) {
        rentalStartDate = ren.rental_start_date
        vehicleNumber = ren.vehicle_number
      } else if (rl) {
        rentalStartDate = rl.rental_start_date
      }
    }
    if (!vehicleNumber) {
      const ren = renByRiderMap.get(p.rider_id)
      vehicleNumber = ren?.vehicle_number || rider?.vehicle_assigned || null
    }
    if (rentalStartDate && p.due_date) {
      const startMs = new Date(`${rentalStartDate}T12:00:00Z`).getTime()
      const dueMs = new Date(`${p.due_date}T12:00:00Z`).getTime()
      const days = Math.round((dueMs - startMs) / (24 * 3600 * 1000))
      week = Math.max(1, Math.floor(days / 7) + 1)
    }
  }

  const fromDate =
    rentalStartDate && week
      ? addDays(parseDateOnly(rentalStartDate), (week - 1) * 7)
      : null
  const toDate = fromDate ? addDays(fromDate, 6) : null
  const tl = p.collected_by || rider?.onboarded_by || '—'

  return { rider, week, rentalStartDate, vehicleNumber, fromDate, toDate, tl }
}

function makeCtx({ rentalPayments, riderLedgers, rentalLedgers, riders }) {
  const riderMap = new Map(riders.map((r) => [r.rider_id, r]))
  const rpMap = new Map(rentalPayments.map((r) => [r.payment_id, r]))
  const rlByIdMap = new Map(riderLedgers.map((r) => [r.id, r]))
  const renByIdMap = new Map(rentalLedgers.map((r) => [r.id, r]))
  const renByRiderMap = new Map()
  const sortedRen = [...rentalLedgers].sort((a, b) =>
    (b.created_at || '').localeCompare(a.created_at || '')
  )
  for (const r of sortedRen) {
    if (!renByRiderMap.has(r.rider_id)) renByRiderMap.set(r.rider_id, r)
  }
  return { riderMap, rpMap, rlByIdMap, renByIdMap, renByRiderMap }
}

function daysBetween(d1, d2) {
  if (!d1 || !d2) return null
  const ms1 = new Date(d1).setHours(0, 0, 0, 0)
  const ms2 = new Date(d2).setHours(0, 0, 0, 0)
  return Math.round((ms2 - ms1) / 86400000)
}

function buildRentalRows(data) {
  const ctx = makeCtx(data)
  return data.rentals
    .map((p) => {
      const e = enrichRentalPayment(p, ctx)

      // Salvage UPI last 4 from notes for legacy payments (e.g. "UPI ID last 4: 2534")
      let upi = p.upi_last4 || ''
      if (!upi && p.notes) {
        const m = p.notes.match(/(?:UPI[^0-9]*)(\d{4})/i)
        if (m) upi = m[1]
      }

      return {
        riderName: p.rider_name || e.rider?.name || '—',
        tlAssigned: e.tl,
        riderId: p.rider_id,
        riderStatus: fmtStatus(e.rider?.status),
        dutyStatus: e.rider?.duty_status || '—',
        vehicleAssigned: e.vehicleNumber || '—',
        week: e.week ?? '',
        fromDate: e.fromDate,
        toDate: e.toDate,
        amount: Number(p.amount || 0),
        paymentCollectedDate: parseDateOnly(p.payment_date),
        upiTxnNo: upi,
        _mode: fmtMode(p.payment_mode),
        _rawPaymentDate: p.payment_date,
      }
    })
    .sort((a, b) => {
      const dA = a._rawPaymentDate || ''
      const dB = b._rawPaymentDate || ''
      if (dA !== dB) return dB.localeCompare(dA)
      return (a.riderId || '').localeCompare(b.riderId || '')
    })
    .map((r, i) => ({ sNo: i + 1, ...r }))
}

// Overdue/Pending rows come from rental_payments (RPC layer) — already has ledger join
function buildOutstandingRowsFromRP(rpRows, riders, today, daysFn, daysKey) {
  const riderMap = new Map(riders.map((r) => [r.rider_id, r]))
  return rpRows
    .filter((p) => p.ledger)
    .map((p) => {
      const ledger = p.ledger
      const rider = riderMap.get(ledger.rider_id)
      const dueDate = parseDateOnly(p.due_date)
      const days = dueDate ? daysFn(dueDate, today) : null
      const fromDate = ledger.rental_start_date
        ? addDays(parseDateOnly(ledger.rental_start_date), (p.week_number - 1) * 7)
        : null
      const toDate = fromDate ? addDays(fromDate, 6) : null
      const tl = rider?.onboarded_by || '—'
      return {
        riderName: ledger.rider_name || rider?.name || '—',
        tlAssigned: tl,
        riderId: ledger.rider_id,
        riderStatus: fmtStatus(rider?.status),
        dutyStatus: rider?.duty_status || '—',
        vehicleAssigned: ledger.vehicle_number || rider?.vehicle_assigned || '—',
        week: p.week_number,
        fromDate,
        toDate,
        amount: Number(p.amount_due || 0),
        dueDate,
        [daysKey]: days ?? '',
        _rawDueDate: p.due_date,
      }
    })
    .sort((a, b) => {
      const dA = a._rawDueDate || ''
      const dB = b._rawDueDate || ''
      if (dA !== dB) return dA.localeCompare(dB)
      return (a.riderId || '').localeCompare(b.riderId || '')
    })
    .map((r, i) => ({ sNo: i + 1, ...r }))
}

function buildOverdueRows(data) {
  // daysOverdue = today - dueDate (positive when bill is past due)
  return buildOutstandingRowsFromRP(
    data.overdues,
    data.riders,
    data.today,
    (dueDate, today) => daysBetween(dueDate, today),
    'daysOverdue'
  )
}

function buildPendingRows(data) {
  // daysUntilDue = dueDate - today (positive when bill is upcoming)
  return buildOutstandingRowsFromRP(
    data.pendings,
    data.riders,
    data.today,
    (dueDate, today) => daysBetween(today, dueDate),
    'daysUntilDue'
  )
}

function buildDepositRows({ deposits, rentalLedgers, riders }) {
  const riderMap = new Map(riders.map((r) => [r.rider_id, r]))
  const renByIdMap = new Map(rentalLedgers.map((r) => [r.id, r]))

  // Most-recent rental_ledger per rider (fallback when payments.ledger_id is null)
  const renByRiderMap = new Map()
  const sortedRen = [...rentalLedgers].sort((a, b) =>
    (b.created_at || '').localeCompare(a.created_at || '')
  )
  for (const r of sortedRen) {
    if (!renByRiderMap.has(r.rider_id)) renByRiderMap.set(r.rider_id, r)
  }

  const enriched = deposits
    .map((d) => {
      const rider = riderMap.get(d.rider_id)
      const ledger =
        (d.ledger_id && renByIdMap.get(d.ledger_id)) ||
        renByRiderMap.get(d.rider_id) ||
        null

      const vehicleNumber = ledger?.vehicle_number || rider?.vehicle_assigned || null

      const tl = d.collected_by || rider?.onboarded_by || '—'

      let upi = d.upi_last4 || ''
      if (!upi && d.notes) {
        const m = d.notes.match(/(?:UPI[^0-9]*)(\d{4})/i)
        if (m) upi = m[1]
      }

      // For deposits, prefer collected_at (real receipt time) over payment_date
      // (which is the rental_start_date placeholder for legacy rows).
      const collectedDateStr = d.collected_at
        ? d.collected_at.slice(0, 10)
        : d.payment_date
      const collectedDate = d.collected_at
        ? new Date(d.collected_at)
        : parseDateOnly(d.payment_date)

      return {
        riderName: d.rider_name || rider?.name || '—',
        tlAssigned: tl,
        riderId: d.rider_id,
        riderStatus: fmtStatus(rider?.status),
        dutyStatus: rider?.duty_status || '—',
        vehicleAssigned: vehicleNumber || '—',
        amount: Number(d.amount || 0),
        mode: fmtMode(d.payment_mode),
        paymentCollectedDate: collectedDate,
        upiTxnNo: upi,
        _rawPaymentDate: collectedDateStr,
      }
    })
    .sort((a, b) => {
      const dA = a._rawPaymentDate || ''
      const dB = b._rawPaymentDate || ''
      if (dA !== dB) return dB.localeCompare(dA)
      return (a.riderId || '').localeCompare(b.riderId || '')
    })
    .map((r, i) => ({ sNo: i + 1, ...r }))

  return enriched
}

function buildSummary(rows, dateField = 'paymentCollectedDate') {
  const total = rows.reduce((s, r) => s + r.amount, 0)
  const count = rows.length
  const dates = rows.map((r) => r[dateField]).filter(Boolean)
  const minDate = dates.length ? new Date(Math.min(...dates.map((d) => d.getTime()))) : null
  const maxDate = dates.length ? new Date(Math.max(...dates.map((d) => d.getTime()))) : null
  return { total, count, minDate, maxDate }
}

// Cross-cut: TL → { collected, overdue, pending } in one row
function buildTLPerformance({ rentalRows, depositRows, overdueRows, pendingRows }) {
  const map = new Map()
  function add(rows, key) {
    for (const r of rows) {
      const tl = r.tlAssigned || '—'
      const cur = map.get(tl) || { tl, collected: 0, overdue: 0, pending: 0 }
      cur[key] += r.amount
      map.set(tl, cur)
    }
  }
  add(rentalRows, 'collected')
  add(depositRows, 'collected')
  add(overdueRows, 'overdue')
  add(pendingRows, 'pending')
  return [...map.values()].sort((a, b) => b.collected - a.collected)
}

// Cross-cut: Rider Status → { overdue, pending } — risk concentration
function buildOutstandingByStatus({ overdueRows, pendingRows }) {
  const map = new Map()
  function add(rows, key) {
    for (const r of rows) {
      const s = r.riderStatus || '—'
      const cur = map.get(s) || { status: s, overdue: 0, pending: 0 }
      cur[key] += r.amount
      map.set(s, cur)
    }
  }
  add(overdueRows, 'overdue')
  add(pendingRows, 'pending')
  return [...map.values()].sort((a, b) => b.overdue + b.pending - (a.overdue + a.pending))
}

function thinBorder() {
  return {
    top: { style: 'thin', color: { argb: COLORS.border } },
    left: { style: 'thin', color: { argb: COLORS.border } },
    bottom: { style: 'thin', color: { argb: COLORS.border } },
    right: { style: 'thin', color: { argb: COLORS.border } },
  }
}

function writeSummarySheet(
  wb,
  { rentalSummary, depositSummary, overdueSummary, pendingSummary, tlPerformance, outstandingByStatus, horizonDate }
) {
  const ws = wb.addWorksheet('Summary', { views: [{ showGridLines: false }] })

  // 4 numeric columns + spacers
  ws.getColumn(1).width = 4
  ws.getColumn(2).width = 30
  ws.getColumn(3).width = 16
  ws.getColumn(4).width = 16
  ws.getColumn(5).width = 16
  ws.getColumn(6).width = 4

  // === Title ===
  ws.mergeCells('B2:E2')
  const title = ws.getCell('B2')
  title.value = 'Collections Report'
  title.font = { bold: true, size: 18, color: { argb: COLORS.headerFg } }
  title.alignment = { vertical: 'middle', horizontal: 'center' }
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.titleBg } }
  ws.getRow(2).height = 32

  ws.mergeCells('B3:E3')
  const sub = ws.getCell('B3')
  sub.value = `Generated ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`
  sub.font = { italic: true, size: 10, color: { argb: 'FF555555' } }
  sub.alignment = { vertical: 'middle', horizontal: 'center' }
  ws.getRow(3).height = 20

  let row = 5

  function sectionHeader(label, r) {
    ws.mergeCells(`B${r}:E${r}`)
    const c = ws.getCell(`B${r}`)
    c.value = label
    c.font = { bold: true, size: 13, color: { argb: COLORS.headerFg } }
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } }
    c.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
    ws.getRow(r).height = 26
  }

  // Headline KV — single value spanning C:E
  function kv(r, label, value, opts = {}) {
    const kc = ws.getCell(`B${r}`)
    kc.value = label
    kc.font = { size: 11, bold: !!opts.bold }
    kc.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
    ws.mergeCells(`C${r}:E${r}`)
    const vc = ws.getCell(`C${r}`)
    vc.value = value
    vc.font = {
      bold: true,
      size: opts.highlight ? 14 : 11,
      color: { argb: opts.color || (opts.highlight ? COLORS.positive : 'FF000000') },
    }
    vc.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 }
    if (opts.fmt) vc.numFmt = opts.fmt
    ;[kc, vc].forEach((c) => (c.border = thinBorder()))
    if (opts.highlight) {
      const bg = opts.bgColor || COLORS.totalBg
      kc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }
      vc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }
    }
    ws.getRow(r).height = opts.highlight ? 26 : 20
  }

  // Multi-column table: headers + data rows + total row
  function table({ headers, rows: tableRows, totalLabel, fmts }) {
    // Header
    headers.forEach((h, i) => {
      const c = ws.getCell(row, 2 + i)
      c.value = h
      c.font = { bold: true, color: { argb: COLORS.headerFg }, size: 11 }
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } }
      c.alignment = {
        vertical: 'middle',
        horizontal: i === 0 ? 'left' : 'right',
        indent: 1,
      }
      c.border = thinBorder()
    })
    ws.getRow(row).height = 22
    row += 1

    tableRows.forEach((tr, idx) => {
      const banded = idx % 2 === 1
      tr.forEach((cellValue, i) => {
        const c = ws.getCell(row, 2 + i)
        c.value = cellValue
        c.alignment = {
          vertical: 'middle',
          horizontal: i === 0 ? 'left' : 'right',
          indent: 1,
        }
        if (fmts && fmts[i]) c.numFmt = fmts[i]
        if (banded) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.bandBg } }
        c.border = thinBorder()
        c.font = { size: 11 }
      })
      ws.getRow(row).height = 19
      row += 1
    })

    // Total row
    const totalsRow = headers.map((_, i) =>
      i === 0 ? totalLabel : tableRows.reduce((s, r) => s + (Number(r[i]) || 0), 0)
    )
    totalsRow.forEach((v, i) => {
      const c = ws.getCell(row, 2 + i)
      c.value = v
      c.font = { bold: true, size: 11 }
      c.alignment = {
        vertical: 'middle',
        horizontal: i === 0 ? 'left' : 'right',
        indent: 1,
      }
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.totalBg } }
      if (fmts && fmts[i]) c.numFmt = fmts[i]
      c.border = {
        top: { style: 'medium', color: { argb: COLORS.totalBorder } },
        bottom: { style: 'medium', color: { argb: COLORS.totalBorder } },
        left: { style: 'thin', color: { argb: COLORS.border } },
        right: { style: 'thin', color: { argb: COLORS.border } },
      }
    })
    ws.getRow(row).height = 22
    row += 2
  }

  // === HEADLINE ===
  const grandCollected = rentalSummary.total + depositSummary.total
  const totalOutstanding = overdueSummary.total + pendingSummary.total
  const fmtDate = (d) =>
    d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

  // Collection rate: of bills that should have been collected by now (collected rentals + overdue),
  // what % did we collect?
  const collectionDenom = rentalSummary.total + overdueSummary.total
  const collectionRate = collectionDenom > 0 ? rentalSummary.total / collectionDenom : null

  sectionHeader('Headline', row)
  row += 1
  kv(row++, 'Grand Total Collected', grandCollected, {
    highlight: true,
    bold: true,
    fmt: '"₹"#,##0',
    color: COLORS.positive,
  })
  kv(row++, `   Weekly Rentals  (${rentalSummary.count})`, rentalSummary.total, { fmt: '"₹"#,##0' })
  kv(row++, `   Security Deposits  (${depositSummary.count})`, depositSummary.total, { fmt: '"₹"#,##0' })
  row += 1
  kv(row++, 'Total Outstanding', totalOutstanding, {
    highlight: true,
    bold: true,
    fmt: '"₹"#,##0',
    color: 'FFB45F06',
    bgColor: 'FFFFF2CC',
  })
  kv(row++, `   Overdue  (${overdueSummary.count})`, overdueSummary.total, {
    fmt: '"₹"#,##0',
    color: 'FFCC0000',
  })
  kv(row++, `   Due This Week  (${pendingSummary.count})`, pendingSummary.total, {
    fmt: '"₹"#,##0',
  })
  row += 1
  if (collectionRate !== null) {
    kv(row++, 'Collection Rate', collectionRate, { fmt: '0.0%', bold: true })
  }
  if (rentalSummary.minDate && rentalSummary.maxDate) {
    kv(
      row++,
      'Collections Date Range',
      `${fmtDate(rentalSummary.minDate)}  to  ${fmtDate(rentalSummary.maxDate)}`
    )
  }
  row += 1

  // === PERFORMANCE BY TEAM LEAD ===
  sectionHeader('Performance by Team Lead', row)
  row += 1
  table({
    headers: ['TL', 'Collected', 'Overdue', 'Pending'],
    rows: tlPerformance.map((t) => [t.tl, t.collected, t.overdue, t.pending]),
    totalLabel: 'TOTAL',
    fmts: [null, '"₹"#,##0', '"₹"#,##0', '"₹"#,##0'],
  })

  // === OUTSTANDING BY RIDER STATUS ===
  sectionHeader('Outstanding by Rider Status', row)
  row += 1
  table({
    headers: ['Rider Status', 'Overdue', 'Pending', 'Total'],
    rows: outstandingByStatus.map((s) => [
      s.status,
      s.overdue,
      s.pending,
      s.overdue + s.pending,
    ]),
    totalLabel: 'TOTAL',
    fmts: [null, '"₹"#,##0', '"₹"#,##0', '"₹"#,##0'],
  })
}

function writeDetailSheet(wb, rows) {
  const ws = wb.addWorksheet('Weekly Rentals', {
    views: [{ state: 'frozen', ySplit: 1 }],
  })

  ws.columns = [
    { header: 'S.NO', key: 'sNo', width: 6 },
    { header: 'Rider Name', key: 'riderName', width: 24 },
    { header: 'TL Assigned', key: 'tlAssigned', width: 12 },
    { header: 'Rider ID', key: 'riderId', width: 11 },
    { header: 'Rider Status', key: 'riderStatus', width: 13 },
    { header: 'Duty Status', key: 'dutyStatus', width: 12 },
    { header: 'Vehicle Assigned', key: 'vehicleAssigned', width: 14 },
    { header: 'Week', key: 'week', width: 7 },
    { header: 'From', key: 'fromDate', width: 13, style: { numFmt: 'dd-mmm-yyyy' } },
    { header: 'To', key: 'toDate', width: 13, style: { numFmt: 'dd-mmm-yyyy' } },
    { header: 'Amount', key: 'amount', width: 13, style: { numFmt: '"₹"#,##0' } },
    { header: 'Payment Collected Date', key: 'paymentCollectedDate', width: 20, style: { numFmt: 'dd-mmm-yyyy' } },
    { header: 'UPI Txn No.', key: 'upiTxnNo', width: 13 },
  ]

  // Header row styling
  const header = ws.getRow(1)
  header.height = 28
  header.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } }
    cell.font = { color: { argb: COLORS.headerFg }, bold: true, size: 11 }
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    cell.border = thinBorder()
  })

  // Data rows
  rows.forEach((r, idx) => {
    const row = ws.addRow(r)
    row.height = 18
    const banded = idx % 2 === 1
    row.eachCell((cell, colNumber) => {
      cell.border = thinBorder()
      cell.alignment = {
        vertical: 'middle',
        horizontal:
          colNumber === 1 || colNumber === 8
            ? 'center'
            : colNumber === 11
              ? 'right'
              : colNumber >= 9 && colNumber <= 12
                ? 'center'
                : 'left',
        indent: cell.alignment?.horizontal === 'left' ? 1 : 0,
      }
      cell.font = { size: 10 }
      if (banded) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.bandBg } }
      }
    })
  })

  // Grand total row
  const totalAmount = rows.reduce((s, r) => s + r.amount, 0)
  const lastDataRow = ws.lastRow.number
  const totalRowNum = lastDataRow + 1
  ws.mergeCells(`A${totalRowNum}:J${totalRowNum}`)
  const labelCell = ws.getCell(`A${totalRowNum}`)
  labelCell.value = `TOTAL  (${rows.length} payments)`
  labelCell.font = { bold: true, size: 11, color: { argb: COLORS.headerBg } }
  labelCell.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 }
  labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.totalBg } }

  const amountCell = ws.getCell(`K${totalRowNum}`)
  amountCell.value = totalAmount
  amountCell.numFmt = '"₹"#,##0'
  amountCell.font = { bold: true, size: 12, color: { argb: COLORS.positive } }
  amountCell.alignment = { vertical: 'middle', horizontal: 'right' }
  amountCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.totalBg } }

  ws.mergeCells(`L${totalRowNum}:M${totalRowNum}`)
  const tail = ws.getCell(`L${totalRowNum}`)
  tail.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.totalBg } }

  // Border on the total row
  for (let col = 1; col <= 13; col++) {
    const c = ws.getCell(totalRowNum, col)
    c.border = {
      top: { style: 'medium', color: { argb: COLORS.totalBorder } },
      bottom: { style: 'medium', color: { argb: COLORS.totalBorder } },
      left: { style: 'thin', color: { argb: COLORS.border } },
      right: { style: 'thin', color: { argb: COLORS.border } },
    }
  }
  ws.getRow(totalRowNum).height = 24

  // Auto filter
  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: lastDataRow, column: 13 },
  }
}

function writeDepositSheet(wb, rows) {
  const ws = wb.addWorksheet('Security Deposits', {
    views: [{ state: 'frozen', ySplit: 1 }],
  })

  ws.columns = [
    { header: 'S.NO', key: 'sNo', width: 6 },
    { header: 'Rider Name', key: 'riderName', width: 24 },
    { header: 'TL Assigned', key: 'tlAssigned', width: 12 },
    { header: 'Rider ID', key: 'riderId', width: 11 },
    { header: 'Rider Status', key: 'riderStatus', width: 13 },
    { header: 'Duty Status', key: 'dutyStatus', width: 12 },
    { header: 'Vehicle Assigned', key: 'vehicleAssigned', width: 14 },
    { header: 'Amount', key: 'amount', width: 13, style: { numFmt: '"₹"#,##0' } },
    { header: 'Mode', key: 'mode', width: 14 },
    { header: 'Payment Collected Date', key: 'paymentCollectedDate', width: 20, style: { numFmt: 'dd-mmm-yyyy' } },
    { header: 'UPI Txn No.', key: 'upiTxnNo', width: 13 },
  ]

  // Header styling
  const header = ws.getRow(1)
  header.height = 28
  header.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } }
    cell.font = { color: { argb: COLORS.headerFg }, bold: true, size: 11 }
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    cell.border = thinBorder()
  })

  // Data rows
  rows.forEach((r, idx) => {
    const row = ws.addRow(r)
    row.height = 18
    const banded = idx % 2 === 1
    row.eachCell((cell, colNumber) => {
      cell.border = thinBorder()
      const isAmount = colNumber === 8
      const isMode = colNumber === 9
      const isDate = colNumber === 10
      const isCenter = colNumber === 1 || isMode || isDate || colNumber === 11
      cell.alignment = {
        vertical: 'middle',
        horizontal: isCenter ? 'center' : isAmount ? 'right' : 'left',
        indent: !isCenter && !isAmount ? 1 : 0,
      }
      cell.font = { size: 10 }
      if (banded) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.bandBg } }
      }
    })
  })

  // Grand total row
  const totalAmount = rows.reduce((s, r) => s + r.amount, 0)
  const lastDataRow = ws.lastRow.number
  const totalRowNum = lastDataRow + 1
  ws.mergeCells(`A${totalRowNum}:G${totalRowNum}`)
  const labelCell = ws.getCell(`A${totalRowNum}`)
  labelCell.value = `TOTAL  (${rows.length} deposits)`
  labelCell.font = { bold: true, size: 11, color: { argb: COLORS.headerBg } }
  labelCell.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 }
  labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.totalBg } }

  const amountCell = ws.getCell(`H${totalRowNum}`)
  amountCell.value = totalAmount
  amountCell.numFmt = '"₹"#,##0'
  amountCell.font = { bold: true, size: 12, color: { argb: COLORS.positive } }
  amountCell.alignment = { vertical: 'middle', horizontal: 'right' }
  amountCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.totalBg } }

  ws.mergeCells(`I${totalRowNum}:K${totalRowNum}`)
  const tail = ws.getCell(`I${totalRowNum}`)
  tail.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.totalBg } }

  for (let col = 1; col <= 11; col++) {
    const c = ws.getCell(totalRowNum, col)
    c.border = {
      top: { style: 'medium', color: { argb: COLORS.totalBorder } },
      bottom: { style: 'medium', color: { argb: COLORS.totalBorder } },
      left: { style: 'thin', color: { argb: COLORS.border } },
      right: { style: 'thin', color: { argb: COLORS.border } },
    }
  }
  ws.getRow(totalRowNum).height = 24

  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: lastDataRow, column: 11 },
  }
}

// Shared renderer for Overdue + Pending sheets — both have same 13-col structure,
// only the last column differs (Days Overdue vs Days Until Due) and color rules.
function writeOutstandingSheet(wb, sheetName, rows, lastColLabel, lastColKey, opts = {}) {
  const ws = wb.addWorksheet(sheetName, { views: [{ state: 'frozen', ySplit: 1 }] })

  ws.columns = [
    { header: 'S.NO', key: 'sNo', width: 6 },
    { header: 'Rider Name', key: 'riderName', width: 24 },
    { header: 'TL Assigned', key: 'tlAssigned', width: 12 },
    { header: 'Rider ID', key: 'riderId', width: 11 },
    { header: 'Rider Status', key: 'riderStatus', width: 13 },
    { header: 'Duty Status', key: 'dutyStatus', width: 12 },
    { header: 'Vehicle Assigned', key: 'vehicleAssigned', width: 14 },
    { header: 'Week', key: 'week', width: 7 },
    { header: 'From', key: 'fromDate', width: 13, style: { numFmt: 'dd-mmm-yyyy' } },
    { header: 'To', key: 'toDate', width: 13, style: { numFmt: 'dd-mmm-yyyy' } },
    { header: 'Amount', key: 'amount', width: 13, style: { numFmt: '"₹"#,##0' } },
    { header: 'Due Date', key: 'dueDate', width: 13, style: { numFmt: 'dd-mmm-yyyy' } },
    { header: lastColLabel, key: lastColKey, width: 14 },
  ]

  // Header styling
  const header = ws.getRow(1)
  header.height = 28
  header.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } }
    cell.font = { color: { argb: COLORS.headerFg }, bold: true, size: 11 }
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    cell.border = thinBorder()
  })

  rows.forEach((r, idx) => {
    const row = ws.addRow(r)
    row.height = 18
    const banded = idx % 2 === 1
    row.eachCell((cell, colNumber) => {
      cell.border = thinBorder()
      const isAmount = colNumber === 11
      const isDate = colNumber >= 9 && colNumber <= 12
      const isCenter = colNumber === 1 || colNumber === 8 || isDate || colNumber === 13
      cell.alignment = {
        vertical: 'middle',
        horizontal: isCenter ? 'center' : isAmount ? 'right' : 'left',
        indent: !isCenter && !isAmount ? 1 : 0,
      }
      cell.font = { size: 10 }
      if (banded) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.bandBg } }
      }
      // Color the days column for overdue: 14+ red bold, 7-13 amber bold
      if (colNumber === 13 && opts.colorDays && typeof cell.value === 'number') {
        const v = cell.value
        if (v >= 14) {
          cell.font = { ...cell.font, bold: true, color: { argb: 'FFCC0000' } }
        } else if (v >= 7) {
          cell.font = { ...cell.font, bold: true, color: { argb: 'FFB45F06' } }
        }
      }
    })
  })

  // Grand total row
  const totalAmount = rows.reduce((s, r) => s + r.amount, 0)
  const lastDataRow = ws.lastRow.number
  const totalRowNum = lastDataRow + 1
  ws.mergeCells(`A${totalRowNum}:J${totalRowNum}`)
  const labelCell = ws.getCell(`A${totalRowNum}`)
  labelCell.value = `TOTAL  (${rows.length} payments)`
  labelCell.font = { bold: true, size: 11, color: { argb: COLORS.headerBg } }
  labelCell.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 }
  labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.totalBg } }

  const amountCell = ws.getCell(`K${totalRowNum}`)
  amountCell.value = totalAmount
  amountCell.numFmt = '"₹"#,##0'
  amountCell.font = { bold: true, size: 12, color: { argb: opts.totalColor || COLORS.positive } }
  amountCell.alignment = { vertical: 'middle', horizontal: 'right' }
  amountCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.totalBg } }

  ws.mergeCells(`L${totalRowNum}:M${totalRowNum}`)
  const tail = ws.getCell(`L${totalRowNum}`)
  tail.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.totalBg } }

  for (let col = 1; col <= 13; col++) {
    const c = ws.getCell(totalRowNum, col)
    c.border = {
      top: { style: 'medium', color: { argb: COLORS.totalBorder } },
      bottom: { style: 'medium', color: { argb: COLORS.totalBorder } },
      left: { style: 'thin', color: { argb: COLORS.border } },
      right: { style: 'thin', color: { argb: COLORS.border } },
    }
  }
  ws.getRow(totalRowNum).height = 24

  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: lastDataRow, column: 13 },
  }
}

const writeOverdueSheet = (wb, rows) =>
  writeOutstandingSheet(wb, 'Overdue Payments', rows, 'Days Overdue', 'daysOverdue', {
    colorDays: true,
    totalColor: 'FFCC0000',
  })

const writePendingSheet = (wb, rows) =>
  writeOutstandingSheet(wb, 'Due This Week', rows, 'Days Until Due', 'daysUntilDue', {
    colorDays: false,
    totalColor: COLORS.headerBg,
  })

async function main() {
  const data = await fetchAll()
  const rentalRows = buildRentalRows(data)
  const depositRows = buildDepositRows(data)
  const overdueRows = buildOverdueRows(data)
  const pendingRows = buildPendingRows(data)

  const rentalSummary = buildSummary(rentalRows)
  const depositSummary = buildSummary(depositRows)
  const overdueSummary = buildSummary(overdueRows, 'dueDate')
  const pendingSummary = buildSummary(pendingRows, 'dueDate')

  const tlPerformance = buildTLPerformance({ rentalRows, depositRows, overdueRows, pendingRows })
  const outstandingByStatus = buildOutstandingByStatus({ overdueRows, pendingRows })

  const grandCollected = rentalSummary.total + depositSummary.total
  const totalOutstanding = overdueSummary.total + pendingSummary.total
  const fmt = (n) => `₹${Number(n).toLocaleString('en-IN')}`

  console.log('\n──── COLLECTIONS ────')
  console.log(`  Grand Collected:    ${fmt(grandCollected)}  (${rentalRows.length + depositRows.length})`)
  console.log(`    Weekly Rentals:   ${fmt(rentalSummary.total)}  (${rentalRows.length})`)
  console.log(`    Security Deposit: ${fmt(depositSummary.total)}  (${depositRows.length})`)
  console.log('──── OUTSTANDING ────')
  console.log(`  Total Outstanding:  ${fmt(totalOutstanding)}  (${overdueRows.length + pendingRows.length})`)
  console.log(`    Overdue:          ${fmt(overdueSummary.total)}  (${overdueRows.length})`)
  console.log(`    Due This Week:    ${fmt(pendingSummary.total)}  (${pendingRows.length})`)
  console.log('──── BY TL ────')
  tlPerformance.forEach((t) =>
    console.log(`  ${t.tl.padEnd(8)} collected=${fmt(t.collected).padEnd(12)} overdue=${fmt(t.overdue).padEnd(10)} pending=${fmt(t.pending)}`)
  )

  const wb = new ExcelJS.Workbook()
  wb.creator = 'Fleet Mgmt Platform'
  wb.created = new Date()
  wb.title = 'Collections Report'

  writeSummarySheet(wb, {
    rentalSummary,
    depositSummary,
    overdueSummary,
    pendingSummary,
    tlPerformance,
    outstandingByStatus,
    horizonDate: data.horizonDate,
  })
  writeDetailSheet(wb, rentalRows)
  writeDepositSheet(wb, depositRows)
  writeOverdueSheet(wb, overdueRows)
  writePendingSheet(wb, pendingRows)

  await wb.xlsx.writeFile(OUTPUT_FILE)
  console.log(`\n✅ Saved to ${OUTPUT_FILE}`)
}

main().catch((e) => {
  console.error('FAILED:', e)
  process.exit(1)
})
