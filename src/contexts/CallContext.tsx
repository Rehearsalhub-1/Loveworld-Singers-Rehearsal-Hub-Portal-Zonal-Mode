'use client'

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { BackendAPI } from '@/lib/api-client'

export type CallState = 
  | 'idle'           // No call
  | 'outgoing'       // Calling someone, waiting for answer
  | 'incoming'       // Receiving a call
  | 'connecting'     // Call answered, establishing connection
  | 'connected'      // Call active and audio flowing
  | 'ending'         // Call ending

export interface CallData {
  id: string
  chatId: string
  callerId: string
  callerName: string
  callerAvatar?: string
  receiverId: string
  receiverName: string
  receiverAvatar?: string
  status: 'ringing' | 'connecting' | 'connected' | 'ended' | 'declined' | 'missed'
  createdAt: number
  answeredAt?: number
  endedAt?: number
  duration?: number
}

export const CALL_TIMEOUT = 30000

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' }
]

function playTone(freq: number, type: OscillatorType, duration: number) {
  if (typeof window === 'undefined') return
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.1, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + duration)
  } catch {}
}

export async function sendCallMessage(chatId: string, reason: string, callerName: string, duration?: number) {
  const text = reason === 'missed' 
    ? 'Missed call' 
    : reason === 'declined' 
      ? 'Call declined' 
      : `Call ended (${duration ? Math.floor(duration / 60) + ':' + (duration % 60).toString().padStart(2, '0') : '0:00'})`
  try {
    await BackendAPI.chats.sendMessage(chatId, { text, type: 'system' })
  } catch (err) {
    console.error('[CallContext] Error sending call message:', err)
  }
}

interface CallContextType {
  callState: CallState
  currentCall: CallData | null
  isMuted: boolean
  callDuration: number
  remoteStream: MediaStream | null
  startCall: (chatId: string, receiverId: string, callerName: string, receiverName: string, callerAvatar?: string, receiverAvatar?: string) => Promise<boolean>
  answerCall: () => Promise<boolean>
  declineCall: () => Promise<void>
  endCall: () => Promise<void>
  toggleMute: () => void
}

const CallContext = createContext<CallContextType | null>(null)

export function useCall() {
  const context = useContext(CallContext)
  if (!context) {
    throw new Error('useCall must be used within CallProvider')
  }
  return context
}

export function CallProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  
  const [callState, setCallState] = useState<CallState>('idle')
  const [currentCall, setCurrentCall] = useState<CallData | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const callStartTimeRef = useRef<number | null>(null)
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const resetState = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop())
      localStreamRef.current = null
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current)
      durationIntervalRef.current = null
    }
    setCallState('idle')
    setCurrentCall(null)
    setIsMuted(false)
    setCallDuration(0)
    setRemoteStream(null)
    callStartTimeRef.current = null
  }, [])

  // Poll / Listen for incoming calls
  useEffect(() => {
    if (!user?.uid) {
      resetState()
      return
    }

    const unsub = BackendAPI.realtime.subscribe('call', user.uid, (incoming: any) => {
      if (incoming && incoming.receiverId === user.uid && incoming.status === 'ringing') {
        setCurrentCall({
          id: incoming.id,
          chatId: incoming.chatId,
          callerId: incoming.callerId,
          callerName: incoming.callerName || 'Caller',
          callerAvatar: incoming.callerAvatar,
          receiverId: incoming.receiverId,
          receiverName: incoming.receiverName || 'Me',
          receiverAvatar: incoming.receiverAvatar,
          status: 'ringing',
          createdAt: Date.now()
        })
        setCallState('incoming')
      } else if (incoming && incoming.id === currentCall?.id && incoming.status === 'ended') {
        playTone(300, 'sine', 0.3)
        resetState()
      }
    })

    return () => {
      unsub()
    }
  }, [user?.uid, currentCall?.id, resetState])

  // Duration timer
  useEffect(() => {
    if (callState === 'connected' || callState === 'connecting') {
      durationIntervalRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1)
      }, 1000)
    } else {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current)
        durationIntervalRef.current = null
      }
    }
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current)
      }
    }
  }, [callState])

  const startCall = useCallback(async (
    chatId: string,
    receiverId: string,
    callerName: string,
    receiverName: string,
    callerAvatar?: string,
    receiverAvatar?: string
  ): Promise<boolean> => {
    if (!user?.uid || callState !== 'idle') return false

    setCallState('outgoing')

    try {
      const res: any = await BackendAPI.calls.create({
        chatId,
        receiverId,
        callerName,
        receiverName,
        callerAvatar,
        receiverAvatar,
        status: 'ringing'
      })

      const callData: CallData = {
        id: res.id || res.data?.id,
        chatId,
        callerId: user.uid,
        callerName,
        callerAvatar,
        receiverId,
        receiverName,
        receiverAvatar,
        status: 'ringing',
        createdAt: Date.now()
      }

      setCurrentCall(callData)

      // Ringing tone
      playTone(440, 'sine', 0.5)

      // Timeout after 30 seconds
      timeoutRef.current = setTimeout(async () => {
        await sendCallMessage(chatId, 'missed', callerName)
        await BackendAPI.calls.update(callData.id, { status: 'missed' }).catch(() => {})
        resetState()
      }, CALL_TIMEOUT)

      return true
    } catch (err) {
      console.error('[CallContext] startCall error:', err)
      resetState()
      return false
    }
  }, [user?.uid, callState, resetState])

  const answerCall = useCallback(async (): Promise<boolean> => {
    if (!currentCall || callState !== 'incoming') return false

    setCallState('connecting')

    try {
      await BackendAPI.calls.update(currentCall.id, { status: 'connected' })
      callStartTimeRef.current = Date.now()

      // Acquire mic
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        localStreamRef.current = stream
      } catch (micErr) {
        console.warn('[CallContext] Microphone permission issue:', micErr)
      }

      setCallState('connected')
      return true
    } catch (err) {
      console.error('[CallContext] answerCall error:', err)
      resetState()
      return false
    }
  }, [currentCall, callState, resetState])

  const declineCall = useCallback(async (): Promise<void> => {
    if (!currentCall) return
    playTone(300, 'sine', 0.2)
    try {
      await BackendAPI.calls.update(currentCall.id, { status: 'declined' })
      await sendCallMessage(currentCall.chatId, 'declined', currentCall.callerName)
    } catch (err) {
      console.error('[CallContext] declineCall error:', err)
    } finally {
      resetState()
    }
  }, [currentCall, resetState])

  const endCall = useCallback(async (): Promise<void> => {
    if (!currentCall) return
    setCallState('ending')
    playTone(250, 'sine', 0.3)
    try {
      await BackendAPI.calls.update(currentCall.id, { status: 'ended', duration: callDuration })
      if (currentCall.callerId === user?.uid) {
        await sendCallMessage(currentCall.chatId, 'answered', currentCall.callerName, callDuration)
      }
    } catch (err) {
      console.error('[CallContext] endCall error:', err)
    } finally {
      resetState()
    }
  }, [currentCall, callDuration, user?.uid, resetState])

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsMuted(!audioTrack.enabled)
      }
    } else {
      setIsMuted(prev => !prev)
    }
  }, [])

  return (
    <CallContext.Provider value={{
      callState,
      currentCall,
      isMuted,
      callDuration,
      remoteStream,
      startCall,
      answerCall,
      declineCall,
      endCall,
      toggleMute
    }}>
      {children}
    </CallContext.Provider>
  )
}
