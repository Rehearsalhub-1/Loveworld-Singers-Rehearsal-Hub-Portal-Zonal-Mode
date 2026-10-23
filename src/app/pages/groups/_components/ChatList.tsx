'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Plus, MessageCircle, Check, CheckCheck, ImageIcon, FileText, Mic, PhoneMissed, Loader2, Edit3, ChevronLeft, Filter, MoreVertical, LayoutGrid, ArrowLeft, Settings, Users } from 'lucide-react'
import { useChatV2 } from '../_context/ChatContextV2'
import { useAuth } from '@/hooks/useAuth'
import { SyncAvatar } from './SyncAvatar'

interface ChatListProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  onNewChat: () => void
  onNewGroup: () => void
  onShowMyProfile: () => void

  onBack?: () => void
  primaryColor: string
  allTypingUsers?: any
}

export function ChatList({
  searchTerm,
  onSearchChange,
  onNewChat,
  onNewGroup,
  onShowMyProfile,

  onBack,
  primaryColor,
  allTypingUsers = {}
}: ChatListProps) {
  const { user: currentUser } = useAuth()
  const { 
    chats, 
    selectedChat, 
    selectChat, 
    getChatDisplayName, 
    getChatAvatar,
    isLoading
  } = useChatV2()

  // Helper for time formatting
  const formatChatTime = (date: Date | any) => {
    if (!date) return ''
    const d = date instanceof Date ? date : new Date(date)
    const now = new Date()
    const isToday = d.toDateString() === now.toDateString()
    
    if (isToday) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  const [filterType, setFilterType] = React.useState<'All' | 'Direct' | 'Groups'>('All')
  const [showFilters, setShowFilters] = React.useState(true)

  return (
    <div className={`w-full md:w-80 lg:w-[380px] flex-shrink-0 bg-white border-r border-gray-200/80 flex flex-col h-full relative overflow-visible ${selectedChat ? 'hidden md:flex' : 'flex'}`}>
      {/* Header */}
      <div className="flex-shrink-0 bg-white z-50 px-4 pt-3 space-y-4 overflow-visible border-b border-gray-100 pb-1">
        {/* Top Action Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBack && (
              <button onClick={onBack} className="md:hidden p-1.5 hover:bg-gray-100 rounded-full transition-all">
                <ArrowLeft className="w-6 h-6 text-[#54656f]" />
              </button>
            )}
            <button 
              onClick={onShowMyProfile}
              className="w-10 h-10 rounded-full overflow-hidden hover:opacity-80 transition-opacity ring-2 ring-transparent hover:ring-gray-200 flex-shrink-0"
            >
              <SyncAvatar 
                userId={currentUser?.uid}
                fallbackName={String(currentUser?.displayName || 'Me')}
                bgColor={primaryColor}
                size="w-10 h-10"
                className="rounded-full"
              />
            </button>
            <h1 className="text-[20px] font-bold text-[#111b21] flex-1 truncate">Chats</h1>
          </div>
          
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={onNewGroup}
              className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-full transition-all text-[#54656f]"
              title="New Group"
            >
              <Users className="w-[20px] h-[20px]" />
            </button>
            <button
              onClick={onNewChat}
              className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-full transition-all text-[#54656f]"
              title="New Chat"
            >
              <Edit3 className="w-[20px] h-[20px]" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Search & Filters */}
        <div className="px-4 py-3 space-y-3 bg-white border-b border-gray-50 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
                    <Search className="w-4 h-4 text-[#54656f]" />
                  </div>
                  <input
                    type="text"
                    className="block w-full pl-11 pr-4 py-[9px] bg-[#f0f2f5] rounded-lg text-[#111b21] placeholder-[#667781] focus:outline-none focus:ring-2 text-[14.5px] transition-all"
                    style={{ ringColor: `${primaryColor}40` } as any}
                    placeholder="Search or start new chat"
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                  />
                </div>
                <button 
                  onClick={() => setShowFilters(!showFilters)}
                  className={`w-10 h-10 flex items-center justify-center rounded-full transition-all flex-shrink-0 ${showFilters ? 'text-blue-600' : 'text-[#54656f] hover:bg-gray-100'}`}
                  style={showFilters ? { backgroundColor: `${primaryColor}15`, color: primaryColor } : {}}
                >
                  <Filter className="w-5 h-5" />
                </button>
              </div>

              {showFilters && (
                <div className="flex items-center gap-4 px-1 overflow-x-auto pb-1 no-scrollbar animate-in slide-in-from-top-2 duration-200">
                  {['All', 'Direct', 'Groups'].map((label) => (
                    <button
                      key={label}
                      onClick={() => setFilterType(label as any)}
                      className={`px-4 py-1.5 rounded-full text-[14px] font-medium transition-all active:scale-95 ${
                        filterType === label 
                        ? 'text-white shadow-sm' 
                        : 'bg-[#f0f2f5] text-[#54656f] hover:bg-gray-200'
                      }`}
                      style={filterType === label ? { backgroundColor: primaryColor } : {}}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Chat List Content */}
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 scroll-smooth bg-white">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 opacity-60">
                  <Loader2 className="w-8 h-8 animate-spin" style={{ color: primaryColor }} />
                  <p className="text-sm font-medium">Loading your chats...</p>
                </div>
              ) : chats.length === 0 ? (
                <div className="p-8 text-center flex flex-col items-center h-full justify-center">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5" style={{ backgroundColor: `${primaryColor}15` }}>
                    <MessageCircle className="w-10 h-10" style={{ color: primaryColor }} />
                  </div>
                  <h3 className="text-[20px] font-normal text-[#41525d] mb-2">No chats yet</h3>
                  <p className="text-[#667781] text-[14px] mb-6 max-w-[260px] leading-[20px]">
                    Start a conversation with your team members or create a group.
                  </p>
                  <button
                    onClick={onNewChat}
                    className="px-6 py-2.5 text-white text-[14px] font-medium rounded-full active:scale-95 transition-all shadow-md"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Start Chatting
                  </button>
                </div>
              ) : (
                <div className="pb-4">
                  {chats
                    .filter(chat => {
                      const name = getChatDisplayName(chat).toLowerCase()
                      const term = searchTerm.toLowerCase()
                      if (!name.includes(term)) return false
                      if (filterType === 'Direct') return chat.type === 'direct'
                      if (filterType === 'Groups') return chat.type === 'group'
                      return true
                    })
                    .map(chat => {
                      const displayName = getChatDisplayName(chat)
                      const avatar = getChatAvatar(chat)
                      const isSelected = selectedChat?.id === chat.id
                      const unreadCount = currentUser?.uid ? ((chat.unreadCount as any)?.[currentUser.uid] || 0) : 0
                      const typingUsersInChat = (allTypingUsers && allTypingUsers[chat.id]) || []

                      return (
                        <button
                          key={chat.id}
                          onClick={() => selectChat(chat)}
                          className={`group w-full flex items-center gap-3 px-3 h-[72px] transition-all relative border-l-[3px] ${
                            isSelected ? 'bg-gray-100 border-current' : 'hover:bg-gray-50 bg-white border-transparent'
                          }`}
                          style={isSelected ? { color: primaryColor } : {}}
                        >
                          <div className="relative flex-shrink-0">
                            <SyncAvatar 
                              userId={chat.type === 'direct' ? chat.participants.find(id => id !== currentUser?.uid) : undefined}
                              initialAvatar={avatar}
                              fallbackName={displayName}
                              isGroup={chat.type === 'group'}
                              bgColor={chat.type === 'group' ? '#00a884' : primaryColor}
                              size="w-[49px] h-[49px]"
                              className="rounded-full overflow-hidden"
                            />
                          </div>

                          <div className="flex-1 min-w-0 flex flex-col justify-center border-b border-[#e9edef] py-[10px] self-stretch">
                            <div className="w-full flex items-center justify-between gap-2 overflow-hidden">
                              <h3 className={`truncate text-[17px] leading-[21px] ${unreadCount > 0 ? 'text-[#111b21] font-medium' : 'text-[#111b21]'}`}>
                                {displayName}
                              </h3>
                              {chat.lastMessage && (
                                <span className={`text-[12px] whitespace-nowrap ${unreadCount > 0 ? 'text-[#25d366]' : 'text-[#667781]'}`}>
                                  {formatChatTime(chat.lastMessage.timestamp)}
                                </span>
                              )}
                            </div>
                            
                            <div className="w-full h-[20px] flex items-center justify-between">
                              <div className="flex-1 min-w-0 flex items-center pr-2">
                                {typingUsersInChat.length > 0 ? (
                                  <div className="flex items-center gap-1 text-emerald-500 font-medium text-sm truncate">
                                    {typingUsersInChat[0].status === 'recording_voice' ? (
                                      <><Mic className="w-3.5 h-3.5" /><span>recording audio...</span></>
                                    ) : (
                                      <><span className="flex items-center h-4 pt-[3px]">
                                        <span className="typing-dot animate-[typing_1s_infinite_0s] bg-emerald-500 w-[5px] h-[5px] rounded-full mx-[1.5px]" />
                                        <span className="typing-dot animate-[typing_1s_infinite_150ms] bg-emerald-500 w-[5px] h-[5px] rounded-full mx-[1.5px]" />
                                        <span className="typing-dot animate-[typing_1s_infinite_300ms] bg-emerald-500 w-[5px] h-[5px] rounded-full mx-[1.5px]" />
                                      </span><span className="ml-[6px]">typing...</span></>
                                    )}
                                  </div>
                                ) : (
                                  <div className={`text-[14px] truncate flex items-center ${unreadCount > 0 ? 'text-[#111b21]' : 'text-[#667781]'}`}>
                                    {chat.lastMessage?.senderId === currentUser?.uid && (
                                      <span className={`flex-shrink-0 flex items-center mr-[6px] ${
                                        (chat.lastMessage as any)?.status === 'read' ? 'text-[#53bdeb]' : 'text-gray-400'
                                      }`}>
                                        {(chat.lastMessage as any)?.status === 'read' ? <CheckCheck className="w-[16px] h-[16px]" /> : <Check className="w-[16px] h-[16px]" />}
                                      </span>
                                    )}
                                    <span className="truncate max-w-[200px]">
                                      {chat.lastMessage?.text || 'New conversation'}
                                    </span>
                                  </div>
                                )}
                              </div>
                              {unreadCount > 0 && (
                                <div className="h-[20px] min-w-[20px] px-[5px] rounded-full flex items-center justify-center text-[11px] text-white font-medium ml-1 flex-shrink-0" style={{ backgroundColor: primaryColor }}>
                                  {unreadCount}
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      )
                    })}
                </div>
              )}
            </div>
      </div>
    </div>
  )
}
