import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { parseProgramDate } from '@/utils/date-parser'

interface ServerTimeResponse {
  serverTime: string
  timestamp: number
  timezone: string
}

interface CountdownData {
  days: number
  hours: number
  minutes: number
  seconds: number
}

interface UseServerCountdownProps {
  targetDate?: Date
  targetDateString?: string
  countdownData?: CountdownData
  praiseNightId?: string | number
}

export function useServerCountdown({ 
  targetDate, 
  targetDateString,
  countdownData, 
  praiseNightId 
}: UseServerCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<CountdownData>({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  const [serverTimeOffset, setServerTimeOffset] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const targetDateRef = useRef<Date | null>(null)
  const serverTimeOffsetRef = useRef<number>(0)

  // Helper to parse various date formats
  const parseDateString = useCallback((dateStr: string | undefined): Date | null => {
    if (!dateStr) return null;
    try {
      // 1. Clean ordinal suffixes (24th -> 24) and handle case
      let cleaned = dateStr.replace(/(\d+)(st|nd|rd|th)/i, '$1').trim();
      
      // 2. If it lacks a year (e.g., "SUNDAY, 24TH MAY"), append current or next year
      if (!/\d{4}/.test(cleaned)) {
        const now = new Date();
        const currentYear = now.getFullYear();
        
        // Try with current year
        const dateWithCurrentYear = new Date(`${cleaned} ${currentYear}`);
        
        if (!isNaN(dateWithCurrentYear.getTime())) {
          // If the date is in the past by more than a month, it might be for NEXT year
          // (e.g., it's Dec 2025 and date is "Jan 5th")
          if (dateWithCurrentYear.getTime() < now.getTime() - (30 * 24 * 60 * 60 * 1000)) {
            return new Date(`${cleaned} ${currentYear + 1}`);
          }
          return dateWithCurrentYear;
        }
      }

      const date = new Date(cleaned);
      if (!isNaN(date.getTime())) return date;
      
      return null;
    } catch (e) {
      return null;
    }
  }, []);

  // Serialize countdownData for stable dependency comparison
  const countdownKey = useMemo(() => {
    if (!countdownData) return ''
    return `${countdownData.days}-${countdownData.hours}-${countdownData.minutes}-${countdownData.seconds}`
  }, [countdownData?.days, countdownData?.hours, countdownData?.minutes, countdownData?.seconds])

  const fetchServerTime = async () => {
    try {
      const response = await fetch('/api/countdown', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      })
      
      if (!response.ok) throw new Error('Failed to fetch server time')
      
      const data: ServerTimeResponse = await response.json()
      const serverTime = new Date(data.serverTime)
      const clientTime = new Date()
      
      const offset = serverTime.getTime() - clientTime.getTime()
      setServerTimeOffset(offset)
      serverTimeOffsetRef.current = offset
      return serverTime
    } catch (err) {
      // Handle silently - fallback to client time is acceptable for countdowns
      setServerTimeOffset(0)
      serverTimeOffsetRef.current = 0
      return new Date()
    }
  }

  const calculateTimeLeft = useCallback(() => {
    if (!targetDateRef.current) return

    const now = new Date()
    const syncedTime = new Date(now.getTime() + serverTimeOffsetRef.current)
    const difference = targetDateRef.current.getTime() - syncedTime.getTime()
    
    if (difference > 0) {
      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / (1000 * 60)) % 60),
        seconds: Math.floor((difference / 1000) % 60)
      })
    } else {
      setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 })
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    const initializeCountdown = async () => {
      setIsLoading(true)
      setError(null)

            if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }

      try {
        const serverTime = await fetchServerTime()
        let target: Date | null = null

        // 1. Prioritize targetDateString (Program Date)
        const parsedProgramDate = parseProgramDate(targetDateString);
        if (parsedProgramDate && parsedProgramDate.getTime() > serverTime.getTime()) {
          target = parsedProgramDate;
        } 
        
        // 2. Fallback to provided targetDate Date object
        if (!target && targetDate) {
          target = targetDate
        } 
        
        // 3. Fallback to relative countdownData from Admin
        if (!target && countdownData && (countdownData.days > 0 || countdownData.hours > 0 || countdownData.minutes > 0 || countdownData.seconds > 0)) {
          let storedTargetDate: string | null = null

          if (praiseNightId && typeof window !== 'undefined') {
            try {
              const raw = localStorage.getItem(`countdown_${praiseNightId}`);
              if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed.targetDate && (!parsed.countdownKey || parsed.countdownKey === countdownKey)) {
                  storedTargetDate = parsed.targetDate;
                }
              }
            } catch (error) {
              console.error('[Countdown] Failed to fetch stored targetDate:', error);
            }
          }

          if (storedTargetDate) {
            target = new Date(storedTargetDate)
            if (target.getTime() <= serverTime.getTime()) {
              // Recalculate target from countdownData
              const totalMs =
                (countdownData.days * 24 * 60 * 60 * 1000) +
                (countdownData.hours * 60 * 60 * 1000) +
                (countdownData.minutes * 60 * 1000) +
                (countdownData.seconds * 1000)

              target = new Date(serverTime.getTime() + totalMs)
              
              if (praiseNightId && typeof window !== 'undefined') {
                try {
                  localStorage.setItem(`countdown_${praiseNightId}`, JSON.stringify({
                    targetDate: target.toISOString(),
                    countdownKey: countdownKey,
                    updatedAt: new Date(),
                    praiseNightId: praiseNightId
                  }));
                } catch (error) {
                  console.error('[Countdown] Failed to update target date:', error)
                }
              }
            }
          } else {
            const totalMs =
              (countdownData.days * 24 * 60 * 60 * 1000) +
              (countdownData.hours * 60 * 60 * 1000) +
              (countdownData.minutes * 60 * 1000) +
              (countdownData.seconds * 1000)

            target = new Date(serverTime.getTime() + totalMs)

            if (praiseNightId && typeof window !== 'undefined') {
              try {
                localStorage.setItem(`countdown_${praiseNightId}`, JSON.stringify({
                  targetDate: target.toISOString(),
                  countdownKey: countdownKey,
                  createdAt: new Date(),
                  praiseNightId: praiseNightId
                }));
              } catch (error) {
                console.error('[Countdown] Failed to store target date:', error)
              }
            }
          }
        } 
        
        if (!target) {
          setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 })
          setIsLoading(false)
          return
        }

        targetDateRef.current = target
        calculateTimeLeft()
        
        intervalRef.current = setInterval(calculateTimeLeft, 1000)
      } catch (err) {
        console.error('[Countdown] Initialization failed:', err);
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    }

    initializeCountdown()

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [praiseNightId, targetDate, targetDateString, countdownKey, calculateTimeLeft])

  // Removed 30-second sync interval to prevent backend DDOS. Initial sync is sufficient.

  return { timeLeft, isLoading, error, serverTimeOffset }
}
