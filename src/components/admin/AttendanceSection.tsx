import { useState, useEffect, useMemo } from 'react'
import { useZone } from '@/hooks/useZone'
import { Calendar, Search, CheckCircle, Clock, XCircle, FileSpreadsheet, Download, RefreshCw, Users, Plus, Printer, LogOut, AlertCircle, Check, AlertTriangle, UserCheck, UserX, Edit2, FileText, ChevronDown, ChevronLeft, ChevronRight, QrCode } from 'lucide-react'
import CustomLoader from '@/components/CustomLoader'
import { isHQGroup } from '@/config/zones'
import { BackendAPI, unwrap } from '@/lib/api-client'

interface AttendanceRecord {
  id: string
  userId: string
  user_id?: string
  userName?: string
  user_name?: string
  eventName?: string
  event_name?: string
  status: 'present' | 'late' | 'absent'
  check_in_time?: string
  check_out_time?: string
  date_string?: string
  zoneId?: string
  created_at?: string
  createdAt?: string
  is_manual?: boolean
  church?: string
}

export default function AttendanceSection() {
  const { currentZone } = useZone()
  const [attendanceRecords, setAttendanceRecords] = useState<(AttendanceRecord & { user_name: string })[]>([])
  const [allRecords, setAllRecords] = useState<(AttendanceRecord & { user_name: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all') // 'all', 'active', 'completed'
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toLocaleDateString('en-CA'))
  const [showExportMenu, setShowExportMenu] = useState(false)

  // Live Clock-in Session state
  const [isSessionOpen, setIsSessionOpen] = useState(true)
  const [togglingSession, setTogglingSession] = useState(false)

  // Manual Check-In Modal State
  const [showManualModal, setShowManualModal] = useState(false)
  const [manualName, setManualName] = useState('')
  const [manualEvent, setManualEvent] = useState('Rehearsal')
  const [manualStatus, setManualStatus] = useState<'present' | 'absent'>('present')
  const [submittingManual, setSubmittingManual] = useState(false)
  const [manualIsCustom, setManualIsCustom] = useState(false)

  // Edit Event State
  const [showEditModal, setShowEditModal] = useState(false)
  const [bulkEditEventName, setBulkEditEventName] = useState('')
  const [submittingEdit, setSubmittingEdit] = useState(false)
  const [bulkIsCustom, setBulkIsCustom] = useState(false)

  const themeColor = currentZone?.themeColor || '#9333EA'
  const isHQ = isHQGroup(currentZone?.id)

  const TODAY_STR = new Date().toLocaleDateString('en-CA')
  const YESTERDAY_STR = new Date(Date.now() - 86400000).toLocaleDateString('en-CA')
  const isTodaySelected = selectedDate === TODAY_STR
  const isYesterdaySelected = selectedDate === YESTERDAY_STR

  const shiftDate = (days: number) => {
    const current = new Date(selectedDate)
    current.setDate(current.getDate() + days)
    setSelectedDate(current.toLocaleDateString('en-CA'))
  }

  const formattedDateLabel = useMemo(() => {
    if (isTodaySelected) return 'Today'
    if (isYesterdaySelected) return 'Yesterday'
    const d = new Date(selectedDate)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }, [selectedDate, isTodaySelected, isYesterdaySelected])

  const recentEvents = useMemo(() => {
    const events = Array.from(new Set(allRecords.map(r => r.event_name).filter(Boolean))) as string[];
    return events.length > 0 ? events : ['Rehearsal'];
  }, [allRecords]);

  const presentCount = attendanceRecords.filter(r => r.check_in_time && !r.check_out_time).length
  const clockedOutCount = attendanceRecords.filter(r => r.check_out_time).length
  const totalCount = attendanceRecords.length
  const attendanceRate = totalCount > 0 ? Math.round(((presentCount + clockedOutCount) / totalCount) * 100) : 0

  useEffect(() => {
    loadAttendance()
    loadSessionStatus()
  }, [currentZone, selectedDate])

  const loadSessionStatus = async () => {
    if (!currentZone) return
    try {
      const res: any = await BackendAPI.attendance.session({ zoneId: currentZone.id })
      if (res?.data?.isOpen !== undefined) {
        setIsSessionOpen(res.data.isOpen)
      }
    } catch {}
  }

  const handleToggleSession = async () => {
    if (!currentZone) return
    setTogglingSession(true)
    try {
      const next = !isSessionOpen
      await BackendAPI.attendance.toggleSession({ zoneId: currentZone.id, isOpen: next })
      setIsSessionOpen(next)
    } catch (err: any) {
      alert(err?.message || 'Failed to toggle clock-in session')
    } finally {
      setTogglingSession(false)
    }
  }

  const loadAttendance = async (silent = false) => {
    if (!currentZone) return
    if (!silent && allRecords.length === 0) setLoading(true)
    try {
      const queryParams: any = { limit: 'all' }
      if (!isHQ && currentZone?.id) queryParams.zoneId = currentZone.id
      const raw = unwrap<any[]>(await BackendAPI.attendance.getAll(queryParams))
      const records = raw.map((r: any) => {
        const d = new Date(r.checkInTime || r.timestamp || r.createdAt || Date.now())
        return {
          id: r.id,
          userId: r.userId,
          user_id: r.userId || r.user_id,
          user_name: r.user?.name || r.userName || r.user_name || 'Member',
          event_name: r.eventName || r.event_name || 'Rehearsal',
          status: r.status || 'present',
          check_in_time: r.checkInTime || r.check_in_time || d.toISOString(),
          check_out_time: r.checkOutTime || r.check_out_time,
          date_string: d.toLocaleDateString('en-CA'),
          zoneId: r.organizationId || r.zoneId,
          is_manual: Boolean(r.isManual ?? r.is_manual ?? (r.userId && r.userId.startsWith('manual-'))),
          church: r.user?.church || r.user?.group?.name || r.church || '',
        }
      })
      setAllRecords(records)

      let filteredByDate = records.filter(r => {
        if (!r.date_string && r.check_in_time) {
          return new Date(r.check_in_time).toLocaleDateString('en-CA') === selectedDate
        }
        return r.date_string === selectedDate
      })

      setAttendanceRecords(filteredByDate)
    } catch (error) {
      console.error('Error loading attendance:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleManualCheckIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualName.trim() || !currentZone) return

    setSubmittingManual(true)
    try {
      const mockUserId = 'manual-' + Math.random().toString(36).substring(2, 10)
      const newRecord = {
        userId: mockUserId,
        user_id: mockUserId,
        userName: manualName.trim(),
        user_name: manualName.trim(),
        eventName: manualEvent.trim() || 'Rehearsal',
        event_name: manualEvent.trim() || 'Rehearsal',
        status: manualStatus,
        zoneId: currentZone.id,
        qrCode: `LW-MANUAL-${mockUserId}-${Date.now()}`,
        timestamp: new Date(),
        check_in_time: manualStatus === 'present' ? new Date().toISOString() : undefined
      }

      await BackendAPI.generic.create('attendance', newRecord)
      setShowManualModal(false)
      setManualName('')
      await loadAttendance(true)
    } catch (error) {
      console.error('Manual check-in error:', error)
      alert('Failed to record manual check-in.')
    } finally {
      setSubmittingManual(false)
    }
  }

  const handleManualClockOut = async (recordId: string) => {
    try {
      const checkoutTime = new Date().toISOString()
      await BackendAPI.generic.update('attendance', recordId, { check_out_time: checkoutTime })
      
      setAttendanceRecords(prev => 
        prev.map(r => r.id === recordId ? { ...r, check_out_time: checkoutTime } : r)
      )
    } catch (error) {
      console.error('Manual clock out error:', error)
      alert('Failed to clock out member.')
    }
  }

  const handleBulkEditEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bulkEditEventName.trim() || filteredRecords.length === 0) return

    setSubmittingEdit(true)
    try {
      const newEventName = bulkEditEventName.trim()
      
      // Update in batches of 10
      const batchSize = 10
      for (let i = 0; i < filteredRecords.length; i += batchSize) {
        const batch = filteredRecords.slice(i, i + batchSize)
        await Promise.all(batch.map(r => 
          BackendAPI.generic.update('attendance', r.id, { 
            event_name: newEventName,
            eventName: newEventName 
          })
        ))
      }
      
      setShowEditModal(false)
      setBulkEditEventName('')
      await loadAttendance(true) // Reload silently to get fresh data
      alert(`Successfully updated ${filteredRecords.length} records to "${newEventName}"!`)
    } catch (error) {
      console.error('Bulk edit error:', error)
      alert('Failed to update event names.')
    } finally {
      setSubmittingEdit(false)
    }
  }

  const handleExport = (format: 'excel' | 'word' | 'pdf' | 'csv') => {
    setShowExportMenu(false)
    if (format === 'pdf') {
      window.print()
      return
    }

    if (filteredRecords.length === 0) return

    const zoneTitle = isHQ ? 'Loveworld Singers HQ' : (currentZone?.name || 'Rehearsal Hub')
    const dateLabel = selectedDate
    const fileBaseName = `attendance_${selectedDate}`

    const headers = ['#', 'Member Name', 'Event Name', 'Date', 'Clock In', 'Clock Out', 'Status', 'Zone/Chapter']

    const rowsData: string[][] = (filteredRecords as any[]).map((record, idx) => {
      const date = new Date(record.check_in_time || record.created_at || Date.now())
      const clockIn = record.check_in_time ? new Date(record.check_in_time).toLocaleTimeString() : '-'
      const clockOut = record.check_out_time ? new Date(record.check_out_time).toLocaleTimeString() : '-'
      return [
        String(idx + 1),
        record.user_name || 'Member',
        record.event_name || 'Rehearsal',
        date.toLocaleDateString(),
        clockIn,
        clockOut,
        record.status || 'present',
        isHQ ? 'HQ' : (currentZone?.name || 'Zone')
      ]
    })

    if (format === 'csv') {
      const csvData = rowsData.map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(','))
      const csvContent = '\uFEFF' + [headers.join(','), ...csvData].join('\n')
      downloadFile(csvContent, `${fileBaseName}.csv`, 'text/csv;charset=utf-8;')
      return
    }

    const tableRowsHtml = rowsData.map(row => 
      `<tr>${row.map(cell => `<td style="padding: 8px 10px; border: 1px solid #cbd5e1; font-size: 11pt;">${cell}</td>`).join('')}</tr>`
    ).join('')

    const tableHeadersHtml = `<tr>${headers.map(h => `<th style="background-color: #0f172a; color: #ffffff; padding: 10px; border: 1px solid #0f172a; font-weight: bold; font-size: 11pt; text-align: left;">${h}</th>`).join('')}</tr>`

    if (format === 'excel') {
      const excelHtml = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head><meta charset="utf-8" />
        <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Attendance</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
        <style>
          table { border-collapse: collapse; width: 100%; font-family: Calibri, Arial, sans-serif; }
          th { background-color: #0f172a; color: #ffffff; font-weight: bold; padding: 10px; border: 1px solid #0f172a; }
          td { padding: 8px 10px; border: 1px solid #cbd5e1; }
          tr:nth-child(even) { background-color: #f8fafc; }
          h2 { color: #4c1d95; font-family: Calibri, Arial, sans-serif; margin-bottom: 4px; }
          p { color: #64748b; font-family: Calibri, Arial, sans-serif; margin-top: 0; }
        </style>
        </head>
        <body>
          <h2>${zoneTitle} - Attendance Report</h2>
          <p><b>Period/Date:</b> ${dateLabel} | <b>Total Records:</b> ${rowsData.length}</p>
          <table>
            <thead>${tableHeadersHtml}</thead>
            <tbody>${tableRowsHtml}</tbody>
          </table>
        </body>
        </html>
      `
      downloadFile(excelHtml, `${fileBaseName}.xls`, 'application/vnd.ms-excel;charset=utf-8;')
      return
    }

    if (format === 'word') {
      const wordHtml = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>${zoneTitle} Attendance Report</title>
        <!--[if gte mso 9]>
        <xml>
        <w:WordDocument>
        <w:View>Print</w:View>
        <w:Zoom>100</w:Zoom>
        <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          body { font-family: 'Calibri', 'Segoe UI', Arial, sans-serif; margin: 40px; color: #0f172a; }
          .header { border-bottom: 3px solid #7c3aed; padding-bottom: 12px; margin-bottom: 20px; }
          h1 { color: #4c1d95; font-size: 20pt; margin: 0 0 6px 0; }
          .meta { color: #64748b; font-size: 11pt; margin-top: 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 10pt; }
          th { background-color: #0f172a; color: white; text-align: left; padding: 8px 10px; border: 1px solid #0f172a; font-weight: bold; }
          td { padding: 8px 10px; border: 1px solid #cbd5e1; }
          tr:nth-child(even) { background-color: #f8fafc; }
          .footer { margin-top: 30px; font-size: 9pt; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 10px; }
        </style>
        </head>
        <body>
          <div class='header'>
            <h1>${zoneTitle}</h1>
            <p class='meta'><b>Attendance Report</b> — ${dateLabel} | Total Logged: ${rowsData.length}</p>
          </div>
          <table>
            <thead>${tableHeadersHtml}</thead>
            <tbody>${tableRowsHtml}</tbody>
          </table>
          <div class='footer'>Generated by Loveworld Singers Rehearsal Hub on ${new Date().toLocaleString()}</div>
        </body>
        </html>
      `
      downloadFile(wordHtml, `${fileBaseName}.doc`, 'application/msword;charset=utf-8;')
      return
    }
  }

  const downloadFile = (content: string, fileName: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', fileName)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleArchiveRecords = async () => {
    if (!currentZone || allRecords.length === 0) return;
    const confirmArchive = window.confirm("Are you sure you want to archive all visible records? This will clear the current view and start fresh. Archived records are kept in the database but won't show here.");
    if (!confirmArchive) return;
    
    setLoading(true);
    try {
      // Archive records in batches
      const batchSize = 10;
      for (let i = 0; i < allRecords.length; i += batchSize) {
        const batch = allRecords.slice(i, i + batchSize);
        await Promise.all(batch.map(r => 
          BackendAPI.generic.update('attendance', r.id, { archived: true })
        ));
      }
      
      alert("Records successfully archived!");
      await loadAttendance(true);
    } catch (error) {
      console.error("Archive error:", error);
      alert("An error occurred while archiving some records.");
      setLoading(false);
    }
  }


  const filteredRecords = useMemo(() => {
    return attendanceRecords.filter((record) => {
      const matchesSearch = record.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.event_name?.toLowerCase().includes(searchTerm.toLowerCase())
      
      if (!matchesSearch) return false

      // A record is only "live" if it has no checkout time AND the check-in occurred today
      const isLive = !record.check_out_time && record.check_in_time && 
                     (new Date(record.check_in_time).toDateString() === new Date().toDateString())

      if (filterStatus === 'active') return isLive
      if (filterStatus === 'completed') return !!record.check_out_time || (!isLive && record.check_in_time)
      return true
    })
  }, [attendanceRecords, searchTerm, filterStatus])

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 bg-white min-h-[400px]">
        <CustomLoader message="Loading attendance records..." />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-50 pb-24 lg:pb-8 print:bg-white print:pb-0">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 pt-5 lg:pt-8 print:px-0 print:pt-0">

        {/* ── Top Header: Title, Zone, Live Session Pill & Actions ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 print:hidden">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight font-outfit">
                Attendance
              </h1>
              <span
                className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm"
                style={{ backgroundColor: `${themeColor}15`, color: themeColor }}
              >
                {isHQ ? 'HQ Global' : currentZone?.name || 'Zone'}
              </span>
            </div>

            {/* Live Session Toggle Pill (Compact, zero stress, no giant banner!) */}
            {isTodaySelected && (
              <button
                type="button"
                onClick={handleToggleSession}
                disabled={togglingSession}
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border transition-all active:scale-95 disabled:opacity-50 ${
                  isSessionOpen
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200/80 hover:bg-emerald-100'
                    : 'bg-rose-50 text-rose-800 border-rose-200/80 hover:bg-rose-100'
                }`}
                title="Toggle QR Code & App Clock-in Session"
              >
                <span className={`w-2 h-2 rounded-full ${isSessionOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                <span>{isSessionOpen ? 'Clock-in Open' : 'Clock-in Locked'}</span>
                <span className="text-[10px] opacity-60 font-medium">({isSessionOpen ? 'Close' : 'Open'})</span>
              </button>
            )}
          </div>

          {/* Right Actions: Manual Check-in + Export + Rename Event */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowManualModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Check-In</span>
            </button>

            <div className="relative">
              <button
                onClick={() => setShowExportMenu(prev => !prev)}
                disabled={filteredRecords.length === 0}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 shadow-sm transition-all active:scale-95 disabled:opacity-40"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Export</span>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
              </button>

              {showExportMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Export Format
                    </div>
                    <button
                      onClick={() => handleExport('excel')}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      <span>Excel Spreadsheet (.xls)</span>
                    </button>
                    <button
                      onClick={() => handleExport('word')}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                    >
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span>Word Document (.doc)</span>
                    </button>
                    <button
                      onClick={() => handleExport('pdf')}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-xs font-bold text-slate-700 hover:bg-purple-50 hover:text-purple-700 transition-colors"
                    >
                      <Printer className="w-4 h-4 text-purple-600" />
                      <span>Print / Save as PDF</span>
                    </button>
                    <div className="h-px bg-slate-100 my-1" />
                    <button
                      onClick={() => handleExport('csv')}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <Download className="w-4 h-4 text-slate-500" />
                      <span>Raw CSV (.csv)</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => {
                setBulkEditEventName(filteredRecords[0]?.event_name || 'Rehearsal')
                setShowEditModal(true)
              }}
              disabled={filteredRecords.length === 0}
              className="p-2 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 rounded-xl border border-slate-200 shadow-sm transition-all active:scale-95 disabled:opacity-40"
              title="Rename Event Title for all visible records"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ── Unified Single Control Strip (Date Stepper + Filter Tabs + Search) ── */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-2 mb-4 print:hidden">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
            {/* Left: Date Stepper + Status Pills */}
            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
              {/* Clean Date Stepper */}
              <div className="flex items-center bg-slate-50 p-0.5 rounded-xl border border-slate-200/70">
                <button
                  type="button"
                  onClick={() => shiftDate(-1)}
                  className="p-1.5 hover:bg-white rounded-lg text-slate-500 hover:text-slate-800 transition-colors"
                  title="Previous Day"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                <div className="relative px-2 py-0.5 flex items-center gap-1.5 text-xs font-bold text-slate-800 select-none cursor-pointer">
                  <span>{formattedDateLabel}</span>
                  <Calendar className="w-3 h-3 text-purple-600" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                    title="Jump to date"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => shiftDate(1)}
                  disabled={isTodaySelected}
                  className="p-1.5 hover:bg-white rounded-lg text-slate-500 hover:text-slate-800 transition-colors disabled:opacity-20"
                  title="Next Day"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Status Pills with embedded counts */}
              <div className="flex items-center bg-slate-100/80 p-0.5 rounded-xl">
                {[
                  { id: 'all', label: 'All', count: totalCount },
                  { id: 'active', label: 'Active', count: presentCount },
                  { id: 'completed', label: 'Completed', count: clockedOutCount }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setFilterStatus(tab.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      filterStatus === tab.id
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`px-1.5 py-0.2 rounded text-[10px] ${
                      filterStatus === tab.id ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Right: Search & Refresh */}
            <div className="flex items-center gap-2 w-full sm:w-auto ml-auto">
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search singer, event..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-purple-600 transition-all"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <XCircle className="w-3 h-3" />
                  </button>
                )}
              </div>

              <button
                onClick={() => loadAttendance(true)}
                className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 transition-all flex-shrink-0"
                title="Refresh attendance records"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-purple-600' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Table / Empty State ── */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden print:border-none print:shadow-none">
          {filteredRecords.length > 0 && (
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 print:hidden">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Showing {filteredRecords.length} Member{filteredRecords.length !== 1 ? 's' : ''}
              </p>
              <p className="text-xs font-bold text-slate-500">
                {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          )}
          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200">
                {filteredRecords.length > 0 ? (
                  <>
                    {/* Mobile Card List (< md screens) */}
                    <div className="md:hidden divide-y divide-slate-100">
                      {filteredRecords.map((record) => {
                        const isLive = !record.check_out_time && record.check_in_time && 
                                       (new Date(record.check_in_time).toDateString() === new Date().toDateString())
                        return (
                          <div key={record.id} className="p-4 hover:bg-slate-50/50 transition-colors">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-10 h-10 rounded-2xl flex items-center justify-center text-white text-sm font-black flex-shrink-0 shadow-sm"
                                  style={{ backgroundColor: themeColor }}
                                >
                                  {(record.user_name || 'U').charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <h4 className="font-bold text-sm text-slate-900 leading-tight">
                                    {record.user_name || 'Unknown Member'}
                                  </h4>
                                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                    {record.is_manual ? (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
                                        Manual Check-In
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200/60">
                                        <QrCode className="w-2.5 h-2.5 text-purple-600" />
                                        Scanned QR
                                      </span>
                                    )}
                                    {record.church && (
                                      <span className="text-[11px] text-slate-400 font-medium">
                                        • {record.church}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Status Badge */}
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                record.status === 'absent'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200/70'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200/70'
                              }`}>
                                {record.status === 'absent' ? <UserX className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                                {record.status === 'absent' ? 'Absent' : 'Present'}
                              </span>
                            </div>

                            {/* Event & Timestamps */}
                            <div className="mt-3 grid grid-cols-2 gap-2 text-xs bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Clock In</p>
                                <p className="font-bold text-slate-800 mt-0.5">
                                  {record.check_in_time ? new Date(record.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Clock Out</p>
                                {record.check_out_time ? (
                                  <p className="font-bold text-slate-800 mt-0.5">
                                    {new Date(record.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                ) : isLive ? (
                                  <span className="inline-flex items-center gap-1 font-bold text-emerald-700 mt-0.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    In Session
                                  </span>
                                ) : (
                                  <p className="text-slate-400 italic mt-0.5">No Check-Out</p>
                                )}
                              </div>
                            </div>

                            {/* Footer: Event & Action */}
                            <div className="mt-3 flex items-center justify-between gap-2">
                              <span className="text-xs text-slate-600 font-medium truncate max-w-[200px]">
                                {record.event_name || 'Rehearsal'}
                              </span>
                              {isLive && (
                                <button
                                  onClick={() => handleManualClockOut(record.id)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 shadow-sm active:scale-95"
                                >
                                  <LogOut className="w-3 h-3 text-slate-500" />
                                  <span>Clock Out</span>
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Desktop Table View (>= md screens) */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full min-w-[768px] text-left">
                        <thead>
                          <tr className="bg-slate-50/70 border-b border-slate-100 print:bg-white print:border-b-2 print:border-black">
                            <th className="px-5 py-3 text-[11px] font-black text-slate-400 uppercase tracking-wider">Member</th>
                            <th className="px-5 py-3 text-[11px] font-black text-slate-400 uppercase tracking-wider">Event</th>
                            <th className="px-5 py-3 text-[11px] font-black text-slate-400 uppercase tracking-wider">Clock In</th>
                            <th className="px-5 py-3 text-[11px] font-black text-slate-400 uppercase tracking-wider">Status</th>
                            <th className="px-5 py-3 text-[11px] font-black text-slate-400 uppercase tracking-wider text-right print:hidden">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 print:divide-black/20">
                          {filteredRecords.map((record) => {
                            const isLive = !record.check_out_time && record.check_in_time && 
                                           (new Date(record.check_in_time).toDateString() === new Date().toDateString())
                            return (
                              <tr key={record.id} className="hover:bg-slate-50/60 transition-colors group">
                                {/* Member */}
                                <td className="px-5 py-3.5">
                                  <div className="flex items-center gap-3">
                                    <div
                                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-black flex-shrink-0 shadow-sm print:hidden"
                                      style={{ backgroundColor: themeColor }}
                                    >
                                      {(record.user_name || 'U').charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                      <p className="font-bold text-sm text-slate-900 group-hover:text-purple-600 transition-colors">
                                        {record.user_name || 'Unknown Member'}
                                      </p>
                                      <div className="flex items-center gap-1.5 mt-0.5 print:hidden">
                                        {record.is_manual ? (
                                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
                                            Manual Check-In
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200/60">
                                            <QrCode className="w-2.5 h-2.5 text-purple-600" />
                                            Scanned QR
                                          </span>
                                        )}
                                        {record.church && (
                                          <span className="text-[11px] text-slate-400 font-medium">
                                            • {record.church}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                {/* Event */}
                                <td className="px-5 py-3.5">
                                  <span className="text-xs font-medium text-slate-600 truncate block max-w-[220px]">
                                    {record.event_name || 'Rehearsal'}
                                  </span>
                                </td>

                                {/* Clock In */}
                                <td className="px-5 py-3.5">
                                  <span className="font-bold text-xs text-slate-800 tabular-nums">
                                    {record.check_in_time ? new Date(record.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                                  </span>
                                </td>

                                {/* Status / Clock Out */}
                                <td className="px-5 py-3.5">
                                  {record.check_out_time ? (
                                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200/60">
                                      <Clock className="w-3 h-3 text-slate-400 print:hidden" />
                                      Out at {new Date(record.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  ) : isLive ? (
                                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50/90 px-2.5 py-1 rounded-full border border-emerald-200/70">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse print:hidden" />
                                      In Session
                                    </span>
                                  ) : (
                                    <span className="text-xs font-medium text-slate-400 italic">
                                      No Check-Out
                                    </span>
                                  )}
                                </td>

                                {/* Actions */}
                                <td className="px-5 py-3.5 text-right print:hidden">
                                  {isLive ? (
                                    <button
                                      onClick={() => handleManualClockOut(record.id)}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-xs font-bold rounded-lg border border-slate-200 hover:border-slate-300 transition-all shadow-sm active:scale-95"
                                      title="Manually Clock Out Member"
                                    >
                                      <LogOut className="w-3.5 h-3.5 text-slate-500" />
                                      <span>Clock Out</span>
                                    </button>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400">
                                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                                      Completed
                                    </span>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <div className="p-16 text-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-5 border border-slate-100 shadow-inner">
                      <FileSpreadsheet className="w-10 h-10 text-slate-300" />
                    </div>
                    <p className="text-lg font-black text-slate-800 tracking-tight">No attendance records found</p>
                    <p className="text-sm text-slate-400 mt-1 font-medium max-w-sm mx-auto">
                      {searchTerm ? 'No members match your search criteria. Try clearing your filters.' : 'Use the QR Code scanner or Manual Check-In to start recording attendance.'}
                    </p>
                  </div>
                )}
              </div>
        </div>
      </div>

      {/* ── Manual Check-In Modal ── */}
      {showManualModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowManualModal(false)} />

          <div className="relative bg-white rounded-[2.5rem] shadow-2xl max-w-md w-full p-8 border border-slate-100 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Manual Check-In</h3>
                <p className="text-xs text-slate-400 mt-1 font-medium">Instantly log attendance without a QR scan</p>
              </div>
              <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600">
                <Plus className="w-6 h-6" />
              </div>
            </div>

            <form onSubmit={handleManualCheckIn} className="space-y-5">
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2">Member Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2">Event Title</label>
                {!manualIsCustom ? (
                  <select
                    value={manualEvent}
                    onChange={(e) => {
                      if (e.target.value === '___custom___') {
                        setManualIsCustom(true)
                        setManualEvent('')
                      } else {
                        setManualEvent(e.target.value)
                      }
                    }}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all appearance-none cursor-pointer"
                  >
                    {recentEvents.map(ev => <option key={ev} value={ev}>{ev}</option>)}
                    <option value="___custom___" className="text-purple-600 font-bold">+ Add New Program Title...</option>
                  </select>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      autoFocus
                      required
                      placeholder="Type new program name..."
                      value={manualEvent}
                      onChange={(e) => setManualEvent(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!manualEvent.trim()) setManualEvent(recentEvents[0])
                        setManualIsCustom(false)
                      }}
                      className="px-4 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-2xl transition-colors"
                    >
                      Save
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2">Arrival Status</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setManualStatus('present')}
                    className={`flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-bold border transition-all ${
                      manualStatus === 'present'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm ring-2 ring-emerald-500/20'
                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Present (Clock In)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setManualStatus('absent')}
                    className={`flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-bold border transition-all ${
                      manualStatus === 'absent'
                        ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-sm ring-2 ring-rose-500/20'
                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    <UserX className="w-4 h-4" />
                    <span>Absent</span>
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-bold text-sm transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingManual}
                  className="flex-1 py-4 text-white rounded-2xl font-black text-sm shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ backgroundColor: themeColor }}
                >
                  {submittingManual ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Recording...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Confirm Check-In</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Bulk Edit Event Modal ── */}
      {showEditModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowEditModal(false)} />

          <div className="relative bg-white rounded-[2.5rem] shadow-2xl max-w-md w-full p-8 border border-slate-100 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Rename Event</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 hover:bg-slate-100 text-slate-400 rounded-xl transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-sm text-slate-500 mb-6 font-medium">
              This will update the event title for <strong className="text-slate-900">{filteredRecords.length} visible records</strong>.
            </p>

            <form onSubmit={handleBulkEditEvent}>
              <div className="mb-6">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                  New Event Title
                </label>
                {!bulkIsCustom ? (
                  <select
                    value={bulkEditEventName}
                    onChange={(e) => {
                      if (e.target.value === '___custom___') {
                        setBulkIsCustom(true)
                        setBulkEditEventName('')
                      } else {
                        setBulkEditEventName(e.target.value)
                      }
                    }}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all appearance-none cursor-pointer"
                    style={{ ['--tw-ring-color' as any]: themeColor }}
                  >
                    {recentEvents.map(ev => <option key={ev} value={ev}>{ev}</option>)}
                    <option value="___custom___" className="font-bold" style={{ color: themeColor }}>+ Add New Program Title...</option>
                  </select>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      autoFocus
                      required
                      placeholder="Type new program name..."
                      value={bulkEditEventName}
                      onChange={(e) => setBulkEditEventName(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                      style={{ ['--tw-ring-color' as any]: themeColor }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!bulkEditEventName.trim()) setBulkEditEventName(recentEvents[0])
                        setBulkIsCustom(false)
                      }}
                      className="px-4 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-colors"
                    >
                      Save
                    </button>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-bold text-sm transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit || !bulkEditEventName.trim()}
                  className="flex-1 py-4 text-white rounded-2xl font-black text-sm shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ backgroundColor: themeColor }}
                >
                  {submittingEdit ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Update Records</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
