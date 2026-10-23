'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, CheckCheck, Reply, Trash2, Smile, Download, FileText, Mic, Image as ImageIcon, MoreVertical, Edit3, Loader2, Forward, Pin, Copy, ChevronDown } from 'lucide-react'
import { Message, ReactionType } from '../_lib/types'
import { useChatV2 } from '../_context/ChatContextV2'
import { useAuth } from '@/hooks/useAuth'
import { SyncAvatar } from './SyncAvatar'

interface MessageBubbleProps {
  message: Message
  isOwn: boolean
  showAvatar?: boolean
  hasTail?: boolean
  isFirstInGroup?: boolean
  isLastInGroup?: boolean
  primaryColor: string
  onReply?: (message: Message) => void
  onReaction?: (messageId: string, reaction: ReactionType) => void
  onDelete?: (messageId: string) => void
  onEdit?: (messageId: string, currentText: string) => void
  onImageClick?: (url: string) => void
  onForward?: (message: Message) => void
  onPin?: (messageId: string | null) => void
  onJumpToReply?: (messageId: string) => void
  onMessageAction?: (message: Message) => void
  searchQuery?: string
}

const DocumentDownloadButton = ({ attachment, primaryColor }: { attachment: NonNullable<Message['attachment']>, primaryColor: string }) => {
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isDownloading) return
    try {
      setIsDownloading(true)
      const response = await fetch(attachment.url)
      if (!response.ok) throw new Error('Network response was not ok')
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = downloadUrl
      a.download = attachment.name || 'document'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(downloadUrl)
      document.body.removeChild(a)
    } catch (error) {
       console.error('Error downloading document:', error)
       window.open(attachment.url, '_blank')
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <button 
      onClick={handleDownload}
      className="w-full flex justify-between items-center bg-black/5 p-2 rounded mb-1 mt-0.5 hover:bg-black/10 transition-colors group text-left"
    >
      <div className="flex items-center gap-3">
        <div className="bg-[#f06159] p-2 rounded-lg text-white">
          <FileText className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm line-clamp-1 max-w-[160px] font-medium text-[#111b21] group-hover:underline decoration-1">
            {attachment.name}
          </span>
          <span className="text-[11px] text-[#667781] font-medium">
            {attachment.size ? `${(attachment.size / 1024).toFixed(1)} KB` : 'Document'}
          </span>
        </div>
      </div>
      <div className="p-2 text-[#667781] opacity-60 group-hover:opacity-100 transition-opacity">
        {isDownloading ? (
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: primaryColor }} />
        ) : (
          <Download className="w-5 h-5" />
        )}
      </div>
    </button>
  )
}

const VoiceMessagePlayer = ({ url, duration, isOwn, primaryColor }: { url: string, duration?: number, isOwn: boolean, primaryColor: string }) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1)
  const audioRef = React.useRef<HTMLAudioElement>(null)

  const togglePlay = () => {
    if (!audioRef.current) return
    if (isPlaying) audioRef.current.pause()
    else audioRef.current.play()
  }

  const toggleSpeed = () => {
    const rates = [1, 1.5, 2]
    const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length]
    setPlaybackRate(nextRate)
    if (audioRef.current) audioRef.current.playbackRate = nextRate
  }

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60)
    const secs = Math.floor(time % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className={`flex items-center gap-3 p-2 rounded-xl min-w-[200px] ${isOwn ? 'bg-white/10' : 'bg-gray-100'}`}>
      <button
        onClick={togglePlay}
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isOwn ? 'bg-white text-emerald-600' : 'bg-emerald-500 text-white shadow-sm'}`}
      >
        {isPlaying ? <div className="flex gap-1"><div className="w-1 h-3 bg-current rounded-full" /><div className="w-1 h-3 bg-current rounded-full" /></div> : <div className="ml-1 w-0 h-0 border-t-[5px] border-t-transparent border-l-[8px] border-l-current border-b-[5px] border-b-transparent" />}
      </button>
      <div className="flex-1 flex flex-col gap-0.5">
        <div className="h-1.5 w-full bg-black/10 rounded-full overflow-hidden">
          <motion.div 
            className={`h-full ${isOwn ? 'bg-white' : 'bg-emerald-500'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between items-center">
          <span className={`text-[10px] font-bold ${isOwn ? 'text-white/80' : 'text-gray-500'}`}>
            {formatTime(isPlaying ? (audioRef.current?.currentTime || 0) : (duration || 0))}
          </span>
          <Mic className={`w-3 h-3 ${isOwn ? 'text-white/60' : 'text-gray-400'}`} />
        </div>
      </div>
      <button
        onClick={toggleSpeed}
        className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold transition-colors ${
          isOwn ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
        }`}
      >
        {playbackRate}x
      </button>
      <audio
        ref={audioRef}
        src={url}
        preload="none"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => { setIsPlaying(false); setProgress(0); }}
        onTimeUpdate={(e) => setProgress((e.currentTarget.currentTime / e.currentTarget.duration) * 100)}
        className="hidden"
      />
    </div>
  )
}

export function MessageBubble({
  message,
  isOwn,
  showAvatar,
  hasTail,
  isFirstInGroup = true,
  isLastInGroup = true,
  primaryColor,
  onReply,
  onReaction,
  onDelete,
  onEdit,
  onImageClick,
  onForward,
  onPin,
  onJumpToReply,
  onMessageAction,
  searchQuery
}: MessageBubbleProps) {
  const { user } = useAuth()
  const { toggleReaction } = useChatV2()
  const [showActions, setShowActions] = useState(false)

  // Modern rounded bubbles (iMessage style) without explicit SVG tails
  const getBubbleRadius = () => {
    if (isOwn) {
      if (isFirstInGroup && isLastInGroup) return 'rounded-[20px] rounded-br-[4px]'
      if (isFirstInGroup) return 'rounded-[20px] rounded-br-[4px]'
      if (isLastInGroup) return 'rounded-[20px] rounded-br-[20px]'
      return 'rounded-[20px] rounded-br-[4px]'
    } else {
      if (isFirstInGroup && isLastInGroup) return 'rounded-[20px] rounded-bl-[4px]'
      if (isFirstInGroup) return 'rounded-[20px] rounded-bl-[4px]'
      if (isLastInGroup) return 'rounded-[20px] rounded-bl-[20px]'
      return 'rounded-[20px] rounded-bl-[4px]'
    }
  }

  // Copy message text to clipboard
  const handleCopy = () => {
    if (message.text) {
      navigator.clipboard.writeText(message.text)
      setShowActions(false)
    }
  }

  if (message.type === 'system') {
    return (
      <div className="flex justify-center my-3">
        <div className="px-3 py-1.5 bg-[#d1d7db]/40 backdrop-blur-sm rounded-lg text-[12.5px] text-[#54656f] shadow-sm border border-white/20 text-center max-w-[85%]">
          {message.text}
        </div>
      </div>
    )
  }

  const REACTIONS: ReactionType[] = ['❤️', '👍', '😂', '😮', '😢', '🙏', '🔥', '👏', '💯', '✨']

  const formatTime = (date: Date | any) => {
    if (!date) return ''
    const d = date instanceof Date ? date : new Date(date)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  // Tighter spacing for grouped messages (2px vs 8px)
  const marginClass = isLastInGroup ? 'mb-2' : 'mb-[2px]'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className={`flex items-end gap-2 ${marginClass} group ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {!isOwn && showAvatar && (
        <SyncAvatar 
          userId={message.senderId}
          initialAvatar={message.senderAvatar}
          fallbackName={message.senderName}
          size="w-8 h-8"
          className="rounded-full shadow-sm mb-1"
          textClassName="text-[10px]"
        />
      )}
      {!isOwn && !showAvatar && <div className="w-8" />}

      <div className={`flex flex-col max-w-[85%] md:max-w-[70%] lg:max-w-[60%] min-w-0 ${isOwn ? 'items-end' : 'items-start'}`}>
        {!isOwn && showAvatar && (
          <span className="text-[12.5px] font-medium text-[#111b21] ml-1 mb-0.5 opacity-90">{message.senderName}</span>
        )}

        <div className="relative group/bubble">
          <div
            onClick={() => onMessageAction?.(message)}
            onContextMenu={(e) => { e.preventDefault(); onMessageAction?.(message) }}
            className="cursor-pointer relative group/bubble"
          >
            {/* Actions Trigger (Chevron) - Desktop Only Hover */}
            <div className={`absolute top-1 z-30 transition-opacity hidden md:flex ${
              isOwn ? 'right-2' : 'left-2'
            } opacity-0 group-hover/bubble:opacity-100`}>
              <div 
                className="p-1 rounded-full bg-black/5 backdrop-blur-sm shadow-sm hover:bg-black/10 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onMessageAction?.(message);
                }}
              >
                <ChevronDown className={`w-3.5 h-3.5 ${isOwn ? 'text-white' : 'text-gray-500'}`} />
              </div>
            </div>
          <div className="flex items-end">
            <div 
              className={`relative shadow-sm transition-all ${
                isOwn ? '' : 'bg-white border border-gray-100/50'
              } ${getBubbleRadius()}`}
              style={isOwn ? { 
                background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%)`,
                color: '#ffffff'
              } : { color: '#111b21' }}
            >
              <div className="px-2 pt-1.5 min-w-[80px] flex flex-col min-w-0">
                {message.replyTo && (
                  <div 
                    onClick={() => onJumpToReply?.(message.replyTo!.id)}
                    className={`mb-1 p-1.5 rounded-lg cursor-pointer relative overflow-hidden flex flex-col transition-colors border-l-[4px] border-[#06d755] ${
                      isOwn ? 'bg-black/5' : 'bg-[#f0f2f5]'
                    }`}
                  >
                    <div className="pl-2 pr-1">
                      <div className={`text-[12px] font-bold mb-1 line-clamp-1 ${isOwn ? 'text-white/90' : ''}`} style={!isOwn ? { color: primaryColor } : {}}>
                        {message.replyTo.senderName}
                      </div>
                      <div className={`text-[12px] line-clamp-1 ${isOwn ? 'text-white/70' : 'text-gray-500'}`}>
                        {message.replyTo.text}
                      </div>
                    </div>
                  </div>
                )}

                {message.type === 'image' && message.imageUrl && (
                  <div className="mb-1 mt-0.5 -mx-1 rounded overflow-hidden">
                    <img 
                      src={message.imageUrl} 
                      alt="Attached Image" 
                      className="max-h-72 w-full object-cover cursor-pointer" 
                      onClick={() => onImageClick ? onImageClick(message.imageUrl!) : window.open(message.imageUrl, '_blank')}
                    />
                  </div>
                )}

                {message.type === 'voice' && message.voiceUrl && (
                  <div className="mb-1 mt-0.5">
                    <VoiceMessagePlayer 
                      url={message.voiceUrl} 
                      duration={message.voiceDuration} 
                      isOwn={isOwn} 
                      primaryColor={primaryColor} 
                    />
                  </div>
                )}

                {message.type === 'document' && message.attachment && (
                  <DocumentDownloadButton 
                    attachment={message.attachment} 
                    primaryColor={primaryColor} 
                  />
                )}

                <div className="relative flex flex-col pb-1.5 min-w-0">
                  {message.status === 'forwarded' && (
                    <div className={`flex items-center gap-1 text-[12px] italic mb-1.5 ${isOwn ? 'text-white/70' : 'text-[#667781]'}`}>
                      <Forward className="w-3 h-3" /> forwarded
                    </div>
                  )}
                  <div className="flex flex-wrap items-end justify-between gap-x-2">
                    <span className="text-[14.8px] leading-[20px] whitespace-pre-wrap break-words pl-1 min-w-0 flex-1">
                      {searchQuery ? (() => {
                        const parts = (message.text || '').split(new RegExp(`(${searchQuery})`, 'gi'))
                        return parts.map((part, i) => 
                          part.toLowerCase() === searchQuery.toLowerCase() ? (
                            <span key={i} className="bg-yellow-200 text-black px-0.5 rounded-sm font-bold">{part}</span>
                          ) : part
                        )
                      })() : message.text}
                      {message.edited && <span className="text-[11px] text-[#8696a0] ml-1 italic">(edited)</span>}
                    </span>
                    
                    <div className="flex items-center gap-[4px] h-[15px] self-end mb-[-2px] ml-auto">
                      <span className={`text-[11px] leading-none ${isOwn ? 'text-white/70' : 'text-[#667781]'}`}>
                        {formatTime(message.timestamp)}
                      </span>
                      {isOwn && (
                        <div className="flex items-center ml-0.5">
                          {message.status === 'read' ? (
                            <CheckCheck className="w-[16px] h-[16px] text-white" />
                          ) : message.status === 'delivered' ? (
                             <CheckCheck className="w-[16px] h-[16px] text-white/60" />
                          ) : (
                            <Check className="w-[15px] h-[15px] text-white/60" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {message.reactions && Object.keys(message.reactions).length > 0 && (
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={`absolute -bottom-3 flex items-center gap-0.5 px-1.5 py-[2px] bg-white border border-[#e9edef] rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.1)] z-20 ${
                      isOwn ? 'right-0' : 'left-0'
                    }`}
                  >
                    {Object.values(message.reactions).slice(0, 3).map((reaction, i) => (
                      <span key={i} className="text-[11px] leading-none">{reaction}</span>
                    ))}
                    {Object.keys(message.reactions).length > 3 && (
                      <span className="text-[10px] font-medium text-gray-500 ml-0.5 leading-none">{Object.keys(message.reactions).length}</span>
                    )}
                  </motion.div>
                )}
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
