'use client'

import { useState, useEffect } from 'react'
import { useZone } from '@/hooks/useZone'
import { BackendAPI } from '@/lib/api-client'

export interface SchedulingProgram {
  id: string
  zoneId: string
  name: string
  isArchived: boolean
  createdAt: string
  updatedAt: string
  newSongs: any[]
  carriedOver: any[]
  swapped: any[]
  invalidSongs: any[]
  nameChanges: any[]
  dailySchedules: any[]
  submitters: any[]
  weeks?: any[]
  days?: any[]
  currentWeekId?: string
  currentDayId?: string
  isCurrent?: boolean
}

export function useSchedulingBoard() {
  const { currentZone, userRole } = useZone()
  const zoneId = currentZone?.id
  const canEdit = ['hq_admin', 'zone_coordinator', 'boss', 'zone_admin', 'admin'].includes(userRole)

  const [loading, setLoading] = useState(true)
  const [viewHistory, setViewHistory] = useState(false)
  const [programs, setPrograms] = useState<SchedulingProgram[]>([])
  const [activeProgramId, setActiveProgramId] = useState<string | null>(null)

  const loadPrograms = async () => {
    if (!zoneId) return
    setLoading(true)
    try {
      const res: any = await BackendAPI.schedule.getAll({ zoneId }).catch(() => [])
      const list = Array.isArray(res) ? res : (res?.data || [])
      const filtered = list
        .filter((p: any) => Boolean(p.isArchived) === viewHistory)
        .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())

      setPrograms(filtered)
      if (filtered.length > 0) {
        setActiveProgramId((prev) => {
          if (!prev || !filtered.find((p: any) => p.id === prev)) {
            const currentProg = filtered.find((p: any) => p.isCurrent)
            return currentProg ? currentProg.id : filtered[0].id
          }
          return prev
        })
      } else {
        setActiveProgramId(null)
      }
    } catch {
      setPrograms([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPrograms()
  }, [zoneId, viewHistory])

  const activeProgram = programs.find((p) => p.id === activeProgramId) || null

  const createProgram = async (name: string) => {
    if (!zoneId) return
    const newProg: SchedulingProgram = {
      id: 'prog_' + Date.now(),
      zoneId,
      name,
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      newSongs: [],
      carriedOver: [],
      swapped: [],
      invalidSongs: [],
      nameChanges: [],
      dailySchedules: [],
      submitters: [],
    }
    try {
      await BackendAPI.schedule.create(newProg)
    } catch {}
    setPrograms([newProg, ...programs])
    setActiveProgramId(newProg.id)
  }

  const updateProgramData = async (updates: Partial<SchedulingProgram>) => {
    if (!activeProgram) return
    const updated = { ...activeProgram, ...updates, updatedAt: new Date().toISOString() }
    try {
      await BackendAPI.schedule.update(activeProgram.id, updated)
    } catch {}
    setPrograms(programs.map((p) => (p.id === activeProgram.id ? updated : p)))
  }

  const toggleArchive = async () => {
    if (!activeProgram) return
    await updateProgramData({ isArchived: !activeProgram.isArchived })
  }

  const deleteActiveProgram = async () => {
    if (!activeProgramId) return
    try {
      await BackendAPI.schedule.delete(activeProgramId)
    } catch {}
    setPrograms(programs.filter((p) => p.id !== activeProgramId))
    setActiveProgramId(null)
  }

  const renameActiveProgram = async (newName: string) => {
    await updateProgramData({ name: newName })
  }

  const setCurrentProgram = async (programId: string) => {
    const updated = programs.map((p) => ({ ...p, isCurrent: p.id === programId }))
    setPrograms(updated)
    for (const p of updated) {
      try {
        await BackendAPI.schedule.update(p.id, p)
      } catch {}
    }
  }

  return {
    loading,
    canEdit,
    viewHistory,
    setViewHistory,
    programs,
    activeProgramId,
    setActiveProgramId,
    activeProgram,
    createProgram,
    updateProgramData,
    toggleArchive,
    deleteActiveProgram,
    renameActiveProgram,
    setCurrentProgram,
    currentZone,
  }
}
