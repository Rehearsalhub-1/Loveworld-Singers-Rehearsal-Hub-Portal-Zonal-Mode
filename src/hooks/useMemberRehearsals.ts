import { useState, useEffect, useCallback } from 'react'
import { useZone } from './useZone'
import { useAuth } from './useAuth'
import { BackendAPI } from '@/lib/api-client'

export interface CombinedRehearsal {
  id: string
  name: string
  date: string
  location?: string
  description?: string
  scope: 'zone' | 'subgroup'
  scopeLabel: string
  subGroupId?: string
  subGroupName?: string
  zoneId: string
  createdAt: Date
}

export interface UseMemberRehearsalsReturn {
  rehearsals: CombinedRehearsal[]
  zoneRehearsals: CombinedRehearsal[]
  subGroupRehearsals: CombinedRehearsal[]
  loading: boolean
  error: string | null
  filter: 'all' | 'zone' | 'subgroup'
  setFilter: (filter: 'all' | 'zone' | 'subgroup') => void
  refresh: () => Promise<void>
}

export function useMemberRehearsals(): UseMemberRehearsalsReturn {
  const { currentZone } = useZone()
  const { user } = useAuth()
  
  const [rehearsals, setRehearsals] = useState<CombinedRehearsal[]>([])
  const [zoneRehearsals, setZoneRehearsals] = useState<CombinedRehearsal[]>([])
  const [subGroupRehearsals, setSubGroupRehearsals] = useState<CombinedRehearsal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'zone' | 'subgroup'>('all')

  const loadRehearsals = useCallback(async () => {
    if (!currentZone?.id) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const [zoneRes, subRes]: any = await Promise.all([
        BackendAPI.praiseNights.getAll({ zoneId: currentZone.id, limit: 100 }),
        BackendAPI.subgroups.praiseNights({ zoneId: currentZone.id, limit: 100 })
      ]);

      const zoneList: CombinedRehearsal[] = (Array.isArray(zoneRes) ? zoneRes : (zoneRes?.data || [])).map((r: any) => ({
        id: r.id,
        name: r.name || r.title || 'Untitled',
        date: r.date || new Date().toISOString(),
        location: r.location,
        description: r.description,
        scope: 'zone',
        scopeLabel: 'Zone Rehearsal',
        zoneId: currentZone.id,
        createdAt: new Date(r.createdAt || Date.now())
      }));

      const subList: CombinedRehearsal[] = (Array.isArray(subRes) ? subRes : (subRes?.data || [])).map((r: any) => ({
        id: r.id,
        name: r.name || r.title || 'Untitled',
        date: r.date || new Date().toISOString(),
        location: r.location,
        description: r.description,
        scope: 'subgroup',
        scopeLabel: r.subGroupName || 'Subgroup Rehearsal',
        subGroupId: r.subGroupId,
        subGroupName: r.subGroupName,
        zoneId: currentZone.id,
        createdAt: new Date(r.createdAt || Date.now())
      }));

      setZoneRehearsals(zoneList);
      setSubGroupRehearsals(subList);
      const combined = [...zoneList, ...subList].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setRehearsals(combined);
    } catch (err) {
      console.error('Error loading rehearsals:', err)
      setError('Failed to load rehearsals')
    } finally {
      setLoading(false)
    }
  }, [currentZone?.id])

  useEffect(() => {
    loadRehearsals()
  }, [loadRehearsals])

  const getFilteredRehearsals = useCallback(() => {
    switch (filter) {
      case 'zone': return zoneRehearsals
      case 'subgroup': return subGroupRehearsals
      default: return rehearsals
    }
  }, [filter, rehearsals, zoneRehearsals, subGroupRehearsals])

  return {
    rehearsals: getFilteredRehearsals(),
    zoneRehearsals,
    subGroupRehearsals,
    loading,
    error,
    filter,
    setFilter,
    refresh: loadRehearsals
  }
}
