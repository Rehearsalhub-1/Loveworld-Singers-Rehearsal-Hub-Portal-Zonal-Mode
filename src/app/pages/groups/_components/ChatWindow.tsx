'use client'

import { useState, useEffect, useRef } from 'react'
import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Phone, PhoneOff, ArrowLeft, MoreVertical, Search, Check, 
  MessageCircle, Loader2, ChevronDown, Info, Settings, Trash2, LogOut, X, Edit3, Download, Pin, Video,
  Reply, Forward, Copy, Smile, BellOff, ImageIcon
} from 'lucide-react'
import { useCall } from '@/contexts/CallContext'
import { useChatV2 } from '../_context/ChatContextV2'
import { MessageBubble } from './MessageBubble'
import { ChatInput } from './ChatInput'
import { useAuth } from '@/hooks/useAuth'
import { SyncAvatar } from './SyncAvatar'
import { MessageSearchSidebar } from './MessageSearchSidebar'
import { ReactionType } from '../_lib/types'

interface ChatWindowProps {
  primaryColor: string
  onShowGroupSettings: () => void
  onShowDirectChatSettings: () => void
  onBackToList: () => void
  onForward?: (message: any) => void
  onPin?: (messageId: string | null) => void
}

const HEARTBEAT_THRESHOLD_MS = 120000 // 2 minutes (heartbeat window)
const MINUTE_MS = 60000
const HOUR_MS = 3600000
const DAY_MS = 86400000

export function ChatWindow({
  primaryColor,
  onShowGroupSettings,
  onShowDirectChatSettings,
  onBackToList,
  onForward,
  onPin
}: ChatWindowProps) {
  const { user } = useAuth()
  const { 
    selectedChat, 
    messages, 
    isMessagesLoading,
    getChatDisplayName,
    getChatAvatar,
    typingUsers,
    deleteMessage,
    toggleReaction,
    editMessage,
    userPresence
  } = useChatV2()

  const { startCall, callState } = useCall()

  const [replyingTo, setReplyingTo] = useState<{ id: string; text: string; senderName: string } | null>(null)
  const [reactingToMessageId, setReactingToMessageId] = useState<string | null>(null)
  const [editingMessage, setEditingMessage] = useState<{ id: string; text: string } | null>(null)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeActionMessage, setActiveActionMessage] = useState<any>(null)
  const [showHeaderMenu, setShowHeaderMenu] = useState(false)
  const [visibleMessageCount, setVisibleMessageCount] = useState(50)
  
  const onShowSettings = () => {
    if (selectedChat?.type === 'group') onShowGroupSettings()
    else onShowDirectChatSettings()
  }

  const formatLastSeen = (lastSeen: any) => {
    if (!lastSeen) return ''
    const date = new Date(lastSeen.seconds * 1000)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    if (diff < MINUTE_MS) return 'just now'
    if (diff < HOUR_MS) return `${Math.floor(diff / MINUTE_MS)}m ago`
    if (diff < DAY_MS) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    return date.toLocaleDateString()
  }
  const [showScrollBottom, setShowScrollBottom] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const REACTIONS: ReactionType[] = ['❤️', '👍', '😂', '😮', '😢', '🙏', '🔥', '👏', '💯', '✨']

  // Toggle search bar
  const handleSearchToggle = () => {
    setShowSearch(prev => {
      if (!prev) {
        setTimeout(() => searchInputRef.current?.focus(), 50)
      }
      return !prev
    })
    setSearchQuery('')
  }

  // Filter messages for search
  const filteredMessages = searchQuery.trim()
    ? messages.filter(m => m.text?.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages

  // Auto-scroll to bottom
  const scrollToBottom = (behavior: 'smooth' | 'auto' = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior })
  }

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom('smooth')
    }
  }, [messages.length])

  // Handle scroll to show/hide "go to bottom" button
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    const isAtBottom = scrollHeight - scrollTop <= clientHeight + 100
    setShowScrollBottom(!isAtBottom)
  }

  const handleMessageAction = (msgId: string, action: string) => {
    // Implement other actions if needed
  }

  // DOM Limiting: Only render a visible subset of messages to prevent browser crashes
  const displayMessages = searchQuery.trim() 
    ? messages.filter(m => m.text?.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages.slice(-visibleMessageCount)

  // Date Grouping Helper
  const groupMessagesByDate = () => {
    const groups: { [key: string]: typeof displayMessages } = {}
    displayMessages.forEach(msg => {
      const date = new Date(msg.timestamp).toDateString()
      if (!groups[date]) groups[date] = []
      groups[date].push(msg)
    })
    return groups
  }

  const formatGroupDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const yesterday = new Date(now)
    yesterday.setDate(now.getDate() - 1)

    if (date.toDateString() === now.toDateString()) return 'Today'
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
    
    return date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
  }

  // Jump to reply logic
  const jumpToMessage = (messageId: string) => {
    const element = document.getElementById(`msg-${messageId}`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      element.classList.add('animate-message-highlight')
      setTimeout(() => element.classList.remove('animate-message-highlight'), 2000)
    }
  }

  if (!selectedChat) {
    return (
      <div 
        className="flex-1 hidden md:flex flex-col items-center justify-center bg-[#f8f9fa] relative overflow-hidden"
      >
        {/* Subtle Background Pattern / Glow */}
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[120px] opacity-[0.05] pointer-events-none"
          style={{ backgroundColor: primaryColor }}
        />

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center max-w-md px-10 z-10"
        >
          <div 
            className="w-[100px] h-[100px] rounded-full flex items-center justify-center mb-8 shadow-xl ring-4 ring-white"
            style={{ backgroundColor: primaryColor }}
          >
             <MessageCircle className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-[32px] font-black text-[#111b21] mb-3 text-center tracking-tight">Rehearsal Hub</h2>
          <p className="text-[#667781] text-[15px] text-center leading-[24px] max-w-[360px] font-medium">
            Connect with your team, share lyrics, and coordinate rehearsals in real-time. Select a conversation to start.
          </p>
          
          <div className="mt-12 flex items-center gap-2 px-4 py-2 bg-white/50 backdrop-blur-sm rounded-full border border-gray-200/50 shadow-sm transition-all hover:shadow-md cursor-default">
             <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: primaryColor }} />
             <span className="text-[12px] text-gray-500 font-bold uppercase tracking-widest">Zone Connected</span>
          </div>
        </motion.div>

        {/* Bottom Encryption Label */}
        <div className="absolute bottom-10 left-0 right-0 flex items-center justify-center gap-2 text-gray-400">
           <svg viewBox="0 0 10 12" width="10" height="12" className="fill-current">
              <path d="M5.008 1.1c1.249 0 2.261 1.012 2.261 2.26v1.442H2.747V3.36c0-1.248 1.012-2.26 2.261-2.26zm3.334 3.702V3.36C8.342 1.507 6.837 0 5.008 0c-1.83 0-3.334 1.507-3.334 3.36v1.442H0v7.2h10v-7.2H8.342z"></path>
           </svg>
           <span className="text-[12px] font-medium">End-to-end encrypted for your zone</span>
        </div>
      </div>
    )
  }

  const displayName = getChatDisplayName(selectedChat)
  const avatar = getChatAvatar(selectedChat)
  const groupedMessages = groupMessagesByDate()

  return (
    <div className="flex-1 flex flex-col bg-white relative overflow-x-hidden w-full h-full font-sans">
      {/* Premium Glassmorphic Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-2 md:px-5 h-[72px] bg-white/80 backdrop-blur-xl border-b border-gray-100 z-30 min-w-0 shadow-[0_4px_30px_rgba(0,0,0,0.03)] gap-2 sticky top-0">
        <div className="flex items-center gap-2 md:gap-3 overflow-hidden min-w-0 flex-1">
          <button 
            onClick={onBackToList}
            className="md:hidden w-10 h-10 flex-shrink-0 flex items-center justify-center hover:bg-gray-100 rounded-full transition-all"
            style={{ color: primaryColor }}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity min-w-0 flex-1" onClick={onShowSettings}>
            <div className="relative flex-shrink-0">
              <SyncAvatar 
                userId={selectedChat.type === 'direct' ? selectedChat.participants.find(id => id !== user?.uid) : undefined}
                initialAvatar={getChatAvatar(selectedChat)}
                fallbackName={getChatDisplayName(selectedChat)}
                isGroup={selectedChat.type === 'group'}
                bgColor={selectedChat.type === 'group' ? '#00a884' : primaryColor}
                size="w-[40px] h-[40px]"
                className="rounded-full overflow-hidden"
              />
            </div>
            
            <div className="flex flex-col min-w-0">
               <h2 className="font-bold text-[17px] text-[#111b21] truncate leading-tight">
                 {getChatDisplayName(selectedChat)}
               </h2>
               <div className="flex items-center gap-1.5 min-h-[16px] overflow-hidden">
                  {typingUsers && typingUsers.length > 0 ? (
                    <span className="text-[12.5px] font-bold animate-pulse truncate" style={{ color: primaryColor }}>
                      {typingUsers[0].userName.split(' ')[0]} is typing...
                    </span>
                  ) : (
                    <div className="text-[12.5px] text-[#667781] truncate">
                      {selectedChat.type === 'group' ? (
                        `${selectedChat.participants.length} members`
                      ) : (() => {
                        const otherId = selectedChat.participants.find(id => id !== user?.uid)
                        const presence = otherId ? userPresence[otherId] : null
                        if (presence?.status === 'online') {
                          // Only show "online" if lastSeen is within threshold (heartbeat window)
                          const lastSeenMs = presence.lastSeen.seconds * 1000
                          if (Date.now() - lastSeenMs < HEARTBEAT_THRESHOLD_MS) {
                            return <span className="font-bold lowercase tracking-normal" style={{ color: primaryColor }}>online</span>
                          }
                        }
                        if (presence?.lastSeen) {
                          return `last seen ${formatLastSeen(presence.lastSeen)}`
                        }
                        return 'offline'
                      })()}
                    </div>
                  )}
               </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-1 md:gap-2 flex-shrink-0 ml-auto">
          <button 
            onClick={() => setShowSearch(!showSearch)}
            className={`w-10 h-10 flex items-center justify-center rounded-full transition-all ${showSearch ? 'bg-gray-100' : 'hover:bg-gray-100'}`}
            style={{ color: showSearch ? primaryColor : '#54656f' }}
          >
            <Search className="w-5 h-5" />
          </button>
          <button 
            onClick={onShowSettings}
            className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-full transition-all text-[#54656f]"
            title="Group info"
          >
            <Info className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Search Sidebar Integration */}
      <MessageSearchSidebar 
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        messages={messages}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onJumpToMessage={jumpToMessage}
        primaryColor={primaryColor}
      />

      {/* Pinned Message Banner */}
      <AnimatePresence>
        {selectedChat?.pinnedMessageId && messages.find(m => m.id === selectedChat.pinnedMessageId) && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="absolute top-[108px] left-0 right-0 z-20 px-4 py-2 pointer-events-none"
          >
            <div className="bg-white/95 backdrop-blur-sm border border-emerald-100 rounded-xl shadow-lg p-2.5 flex items-center gap-3 pointer-events-auto">
              <div className="bg-emerald-50 p-2 rounded-lg">
                <Pin className="w-4 h-4 text-emerald-600 fill-emerald-600" />
              </div>
              <div 
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => {
                   const msg = messages.find(m => m.id === selectedChat.pinnedMessageId)
                   if (msg) {
                     // Find the element and scroll to it
                     const element = document.getElementById(`msg-${msg.id}`)
                     element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                   }
                }}
              >
                <p className="text-[11px] text-emerald-600 font-bold uppercase tracking-wider mb-0.5">Pinned Message</p>
                <p className="text-[13px] text-gray-700 truncate font-medium">
                  {messages.find(m => m.id === selectedChat.pinnedMessageId)?.text || 'Pinned attachment'}
                </p>
              </div>
              <button 
                onClick={() => onPin?.(null)}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                title="Unpin message"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages Scroll Area - Premium Gradient Background */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        id="chat-messages-container"
        className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 space-y-2 scroll-smooth scrollbar-thin scrollbar-thumb-gray-200 relative bg-[#fafafa]"
      >
        {/* Subtle premium mesh background */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-[0.03] z-0"
          style={{
            backgroundImage: `radial-gradient(at 40% 20%, ${primaryColor} 0px, transparent 50%), radial-gradient(at 80% 0%, ${primaryColor} 0px, transparent 50%), radial-gradient(at 0% 50%, ${primaryColor} 0px, transparent 50%)`,
            backgroundSize: '100% 100%'
          }}
        />
        
        <div className="relative z-10 min-h-full flex flex-col justify-end">
        {isMessagesLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 opacity-50 flex-1">
             <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
             <p className="font-bold text-sm tracking-widest uppercase">Fetching Messages</p>
          </div>
        ) : (
          <div className="flex flex-col justify-end flex-1">
            {messages.length > visibleMessageCount && !searchQuery && (
              <div className="flex justify-center my-6">
                <button 
                  onClick={() => setVisibleMessageCount(prev => prev + 50)}
                  className="px-6 py-2.5 bg-white/80 backdrop-blur border border-gray-200 rounded-full text-sm font-bold text-gray-600 shadow-sm hover:shadow-md hover:bg-gray-50 transition-all active:scale-95"
                >
                  Load previous messages
                </button>
              </div>
            )}
            
            {Object.entries(groupedMessages).map(([date, msgs], groupIdx) => (
              <React.Fragment key={date}>
                {/* Date Separator */}
                <div className="flex justify-center my-6 first:mt-2">
                  <div className="px-4 py-1.5 bg-white/80 backdrop-blur-md rounded-full text-[12px] font-bold text-gray-500 shadow-sm border border-gray-100 uppercase tracking-widest">
                    {formatGroupDate(date)}
                  </div>
                </div>

                {/* Messages in Group */}
                {(() => {
                  const activeMsgs = searchQuery 
                    ? filteredMessages.filter(m => new Date(m.timestamp).toDateString() === date) 
                    : msgs;
                    
                  return activeMsgs.map((message, i) => {
                    const isFirstInBatch = i === 0 || activeMsgs[i-1].senderId !== message.senderId
                    const isLastInBatch = i === activeMsgs.length - 1 || activeMsgs[i+1].senderId !== message.senderId
                    
                    return (
                      <div key={message.id} id={`msg-${message.id}`}>
                        <MessageBubble 
                          message={message}
                          isOwn={message.senderId === user?.uid}
                          showAvatar={isFirstInBatch && selectedChat.type === 'group'}
                          hasTail={isLastInBatch}
                          isFirstInGroup={isFirstInBatch}
                          isLastInGroup={isLastInBatch}
                          primaryColor={primaryColor}
                          onReply={(reply) => setReplyingTo({ id: reply.id, text: reply.text, senderName: reply.senderName })}
                          onJumpToReply={(id) => jumpToMessage(id)}
                          onReaction={(id, reaction) => {
                            toggleReaction(id, reaction)
                          }}
                          onDelete={deleteMessage}
                          onEdit={(id, text) => {
                            setEditingMessage({ id, text })
                          }}
                          onImageClick={setSelectedImage}
                          onForward={onForward}
                          onPin={onPin}
                          onMessageAction={(msg) => setActiveActionMessage(msg)}
                          searchQuery={searchQuery}
                        />
                      </div>
                    )
                  })
                })()}
              </React.Fragment>
            ))}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        )}
        </div>
      </div>

      {/* "New Messages" or "Scroll to Bottom" button */}
      <AnimatePresence>
        {showScrollBottom && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 20 }}
            onClick={() => scrollToBottom()}
            className="absolute bottom-24 right-6 p-3 bg-white text-gray-600 rounded-full shadow-lg border border-gray-200 z-30 hover:bg-gray-50 transition-colors"
          >
            <ChevronDown className="w-6 h-6" />
            {selectedChat && user?.uid && (selectedChat.unreadCount[user.uid] || 0) > 0 && (
              <div 
                className="absolute -top-1.5 -right-1 h-5 min-w-[20px] px-1.5 rounded-full flex items-center justify-center text-[11px] text-white font-medium"
                style={{ backgroundColor: primaryColor }}
              >
                {selectedChat.unreadCount[user.uid]}
              </div>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Message Actions Bottom Sheet */}
      <AnimatePresence>
        {activeActionMessage && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-[100]"
              onClick={() => setActiveActionMessage(null)}
            />
            {/* Bottom Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[101] bg-white rounded-t-2xl shadow-2xl max-h-[70vh] overflow-hidden"
            >
              {/* Drag Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-gray-300 rounded-full" />
              </div>

              {/* Quick Reactions Row */}
              <div className="px-5 py-3 border-b border-gray-100">
                <div className="flex items-center justify-between gap-2">
                  {REACTIONS.slice(0, 8).map(reaction => (
                    <button
                      key={reaction}
                      onClick={() => {
                        toggleReaction(activeActionMessage.id, reaction)
                        setActiveActionMessage(null)
                      }}
                      className="text-[28px] p-1.5 hover:scale-125 active:scale-90 transition-all rounded-xl hover:bg-gray-50"
                    >
                      {reaction}
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      // Show all reactions — just expand
                    }}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                  >
                    <Smile className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>

              {/* Message Preview */}
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                <p className="text-[13px] text-gray-500 truncate">
                  {activeActionMessage.senderName}: {activeActionMessage.text || '(attachment)'}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="py-2">
                {/* Reply */}
                <button
                  onClick={() => {
                    setReplyingTo({ id: activeActionMessage.id, text: activeActionMessage.text, senderName: activeActionMessage.senderName })
                    setActiveActionMessage(null)
                  }}
                  className="w-full px-5 py-3.5 flex items-center gap-5 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                  <Reply className="w-5 h-5 text-[#54656f]" />
                  <span className="text-[16px] text-[#111b21]">Reply</span>
                </button>

                {/* Forward */}
                <button
                  onClick={() => {
                    onForward?.(activeActionMessage)
                    setActiveActionMessage(null)
                  }}
                  className="w-full px-5 py-3.5 flex items-center gap-5 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                  <Forward className="w-5 h-5 text-[#54656f]" />
                  <span className="text-[16px] text-[#111b21]">Forward</span>
                </button>

                {/* Copy (text only) */}
                {activeActionMessage.type === 'text' && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(activeActionMessage.text || '')
                      setActiveActionMessage(null)
                    }}
                    className="w-full px-5 py-3.5 flex items-center gap-5 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                  >
                    <Copy className="w-5 h-5 text-[#54656f]" />
                    <span className="text-[16px] text-[#111b21]">Copy</span>
                  </button>
                )}

                {/* Pin */}
                <button
                  onClick={() => {
                    onPin?.(activeActionMessage.pinnedInChat ? null : activeActionMessage.id)
                    setActiveActionMessage(null)
                  }}
                  className="w-full px-5 py-3.5 flex items-center gap-5 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                  <Pin className={`w-5 h-5 ${activeActionMessage.pinnedInChat ? 'fill-[#54656f] text-[#54656f]' : 'text-[#54656f]'}`} />
                  <span className="text-[16px] text-[#111b21]">{activeActionMessage.pinnedInChat ? 'Unpin' : 'Pin'}</span>
                </button>

                {/* Edit (own text only) */}
                {activeActionMessage.senderId === user?.uid && activeActionMessage.type === 'text' && (
                  <button
                    onClick={() => {
                      setEditingMessage({ id: activeActionMessage.id, text: activeActionMessage.text })
                      setActiveActionMessage(null)
                    }}
                    className="w-full px-5 py-3.5 flex items-center gap-5 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                  >
                    <Edit3 className="w-5 h-5 text-[#54656f]" />
                    <span className="text-[16px] text-[#111b21]">Edit</span>
                  </button>
                )}

                {/* Delete (own only) */}
                {activeActionMessage.senderId === user?.uid && (
                  <button
                    onClick={() => {
                      deleteMessage(activeActionMessage.id)
                      setActiveActionMessage(null)
                    }}
                    className="w-full px-5 py-3.5 flex items-center gap-5 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                  >
                    <Trash2 className="w-5 h-5 text-red-500" />
                    <span className="text-[16px] text-red-500">Delete</span>
                  </button>
                )}
              </div>

              {/* Bottom Safe Area */}
              <div className="h-6" />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Edit Banner */}
      <AnimatePresence>
        {editingMessage && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex-shrink-0 overflow-hidden border-t border-blue-100 bg-blue-50"
          >
            <div className="flex items-center gap-2 px-4 py-2">
              <Edit3 className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <span className="text-xs text-blue-600 font-bold flex-1 truncate">Editing: {editingMessage.text}</span>
              <button onClick={() => setEditingMessage(null)} className="text-blue-400 hover:text-blue-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <div className="flex-shrink-0 relative z-20">
        <ChatInput 
          primaryColor={primaryColor}
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
          editingMessage={editingMessage}
          onEditComplete={(newText) => {
            if (editingMessage) {
              editMessage(editingMessage.id, newText)
              setEditingMessage(null)
            }
          }}
          onCancelEdit={() => setEditingMessage(null)}
        />
      </div>
      
      {/* Image Viewer Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 md:p-8"
            onClick={() => setSelectedImage(null)}
          >
            {/* Action Bar */}
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-end gap-3 bg-gradient-to-b from-black/50 to-transparent">
              <a 
                href={selectedImage} 
                download
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors backdrop-blur text-white flex items-center justify-center"
              >
                <Download className="w-5 h-5" />
              </a>
              <button 
                onClick={() => setSelectedImage(null)}
                className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors backdrop-blur text-white flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <motion.img 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              src={selectedImage}
              alt="Viewed attachment"
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()} // Prevent closing when clicking the image itself
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
