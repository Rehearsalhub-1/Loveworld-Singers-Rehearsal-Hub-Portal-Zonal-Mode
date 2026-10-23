'use client'

import { useState, useEffect, useCallback } from 'react'
import { useZone } from './useZone'
import {
    ScheduleCategory,
    ScheduleSong,
    ScheduleProgram,
} from '@/types/schedule'
import { BackendAPI } from '@/lib/api-client'

interface UseScheduleReturn {
    categories: ScheduleCategory[]
    songs: Record<string, ScheduleSong[]>
    program: ScheduleProgram | null
    allPrograms: ScheduleProgram[]
    isLoading: boolean
    loadSongsForCategory: (categoryId: string) => Promise<void>
    loadProgram: (date?: string, categoryId?: string) => Promise<void>
    refetchCategories: () => Promise<void>
    refetchProgram: () => Promise<void>
}

export function useSchedule(): UseScheduleReturn {
    const { currentZone } = useZone()
    const zoneId = currentZone?.id ?? null

    const [categories, setCategories] = useState<ScheduleCategory[]>([])
    const [songs, setSongs] = useState<Record<string, ScheduleSong[]>>({})
    const [program, setProgram] = useState<ScheduleProgram | null>(null)
    const [allPrograms, setAllPrograms] = useState<ScheduleProgram[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const fetchCategories = useCallback(async () => {
        setIsLoading(true)
        try {
            const res: any = await BackendAPI.generic.list('schedule_categories', 100)
            const list = Array.isArray(res) ? res : (res?.data || [])
            setCategories(list.filter((c: any) => c.isActive !== false).sort((a: any, b: any) => (a.order || 0) - (b.order || 0)))
        } catch (e) {
            console.error('useSchedule: error fetching categories', e)
        } finally {
            setIsLoading(false)
        }
    }, [zoneId])

    const fetchProgram = useCallback(async (date?: string, categoryId?: string) => {
        setIsLoading(true)
        try {
            const res: any = await BackendAPI.schedule.getAll({ zoneId: zoneId || undefined, date, categoryId })
            const list = Array.isArray(res) ? res : (res?.data || [])
            setProgram(list[0] || null)
        } catch (e) {
            console.error('useSchedule: error fetching program', e)
        } finally {
            setIsLoading(false)
        }
    }, [zoneId])

    const fetchAllPrograms = useCallback(async () => {
        try {
            const res: any = await BackendAPI.schedule.getAll({ zoneId: zoneId || undefined, limit: 100 })
            const list = Array.isArray(res) ? res : (res?.data || [])
            setAllPrograms(list)
        } catch (e) {
            console.error('useSchedule: error fetching all programs', e)
        }
    }, [zoneId])

    const loadSongsForCategory = useCallback(async (categoryId: string) => {
        if (songs[categoryId]) return
        try {
            const res: any = await BackendAPI.songs.getAll({ categoryId, zoneId: zoneId || undefined, limit: 200 })
            const list = Array.isArray(res) ? res : (res?.data || [])
            setSongs(prev => ({ ...prev, [categoryId]: list }))
        } catch (e) {
            console.error('useSchedule: error fetching songs', e)
        }
    }, [zoneId, songs])

    useEffect(() => {
        if (zoneId !== undefined) {
            fetchCategories()
            fetchProgram()
            fetchAllPrograms()
        }
    }, [zoneId])

    return {
        categories,
        songs,
        program,
        allPrograms,
        isLoading,
        loadSongsForCategory,
        loadProgram: fetchProgram,
        refetchCategories: fetchCategories,
        refetchProgram: fetchProgram,
    }
}
