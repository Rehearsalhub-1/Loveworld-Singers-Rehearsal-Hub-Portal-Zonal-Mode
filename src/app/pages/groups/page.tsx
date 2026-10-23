'use client'

import { useState, useEffect, useRef, Fragment } from 'react'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useZone } from '@/hooks/useZone'
import { useFeatureTracking } from '@/hooks/useAnalyticsTracking'
import { ChatProviderV2, useChatV2 } from './_context/ChatContextV2'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, MessageCircle, Users, Search, Plus, Send,
  Trash2, X, Check, Loader2, ChevronLeft, ChevronRight, Phone, PhoneOff, Mic, MicOff,
  MoreVertical, FileText, Download, Reply, Copy, Smile, LogOut, UserPlus, Image as ImageIcon,
  Maximize2, Paperclip, Settings, UserMinus, PhoneMissed, Edit3, Camera, User, Mail, Info, ChevronDown,
  LayoutGrid, Clock, UserCircle, Bell
} from 'lucide-react'
import type { UserProfile } from '@/types/supabase'
import { BackendAPI } from '@/lib/api-client'
import type { ChatUser, ReactionType, Message } from './_lib/types'
import { useCall } from '@/contexts/CallContext'

// Modular Components
import { ChatList } from './_components/ChatList'
import { ChatWindow } from './_components/ChatWindow'
import { SyncAvatar } from './_components/SyncAvatar'


// Reaction options - more variety
const REACTIONS: ReactionType[] = ['❤️', '👍', '😂', '😮', '😢', '🙏', '🔥', '👏', '💯', '✨']


// Main page wrapper with provider
export default function GroupsPage() {
  return (
    <ChatProviderV2>
      <GroupsContent />
    </ChatProviderV2>
  )
}

function GroupsContent() {
  const router = useRouter()
  const { user, profile, isLoading: authLoading, refreshProfile } = useAuth()
  const { currentZone } = useZone()

  // Track groups/chat usage
  useFeatureTracking('groups_chat')

  const {
    chats,
    selectedChat,
    messages,
    currentUser,
    isLoading,
    isMessagesLoading,
    selectChat,
    sendMessage,
    sendMediaMessage,
    sendVoiceMessage,
    startDirectChat,
    createGroupChat,
    searchUsers,
    deleteChat,
    deleteMessage,
    toggleReaction,
    editMessage,
    forwardMessage,
    addGroupMembers,
    removeGroupMember,
    leaveGroup,
    deleteGroup,
    renameGroup,
    updateGroupDescription,
    updateChatAvatar,
    pinMessage,
    setTypingStatus,
    typingUsers,
    isGroupCreator,
    getChatDisplayName,
    getChatAvatar,
    allTypingUsers = {}
  } = useChatV2()

  const [showNewChat, setShowNewChat] = useState(false)
  const [showNewGroup, setShowNewGroup] = useState(false)
  const [showGroupSettings, setShowGroupSettings] = useState(false)
  const [showDirectChatSettings, setShowDirectChatSettings] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<ChatUser[]>([])
  const [isSearching, setIsSearching] = useState(false)
  
  // Separate search state for group settings to avoid conflicts
  const [groupSettingsSearchTerm, setGroupSettingsSearchTerm] = useState('')
  const [isGroupSettingsSearching, setIsGroupSettingsSearching] = useState(false)
  const [groupSettingsSearchResults, setGroupSettingsSearchResults] = useState<ChatUser[]>([])
  const [isRenaming, setIsRenaming] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  
  const [messageText, setMessageText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  // Group creation state
  const [groupName, setGroupName] = useState('')
  const [selectedMembers, setSelectedMembers] = useState<ChatUser[]>([])
  const [isCreatingGroup, setIsCreatingGroup] = useState(false)
  const [groupStep, setGroupStep] = useState<1 | 2>(1)

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [audioChunks, setAudioChunks] = useState<Blob[]>([])
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)
  
  // Voice call - use shared context
  const { callState, startCall } = useCall()

  // UI state
  const [viewingImage, setViewingImage] = useState<string | null>(null)
  const [replyingTo, setReplyingTo] = useState<{ id: string; text: string; senderName: string } | null>(null)
  const [showUserProfile, setShowUserProfile] = useState<string | null>(null)
  const [showMyProfile, setShowMyProfile] = useState(false)
  const [viewingProfileData, setViewingProfileData] = useState<UserProfile | null>(null)
  const [isEditingMyProfile, setIsEditingMyProfile] = useState(false)
  const [showGroupMemberSearch, setShowGroupMemberSearch] = useState(false)
  const [isEditingAbout, setIsEditingAbout] = useState(false)
  const [newAboutText, setNewAboutText] = useState('')
  
  // Forwarding state
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null)
  const [showForwardSelector, setShowForwardSelector] = useState(false)
  const [selectedForwardChats, setSelectedForwardChats] = useState<string[]>([])
  const [forwardSearchTerm, setForwardSearchTerm] = useState('')
  const [showStarredMessages, setShowStarredMessages] = useState(false)
  const [isAddingMember, setIsAddingMember] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const isAtBottom = useRef(true)

  // Handle profile viewing (either via member click or direct chat settings)
  useEffect(() => {
    const targetUserId = showUserProfile || (showDirectChatSettings ? selectedChat?.participants.find(id => id !== user?.uid) : null)
    
    if (targetUserId) {
      if (viewingProfileData?.id !== targetUserId) {
        setViewingProfileData(null)
      }
      BackendAPI.profiles.getById(targetUserId)
        .then((data: any) => {
          if (data) setViewingProfileData(data as UserProfile)
        })
        .catch(err => console.error('Error fetching profile:', err))
    }
  }, [showUserProfile, showDirectChatSettings, selectedChat?.id])

  const handleCopyText = (text?: string, label: string = 'Phone number') => {
    if (!text) {
      alert(`No ${label.toLowerCase()} available to copy`)
      return
    }
    navigator.clipboard.writeText(text).then(() => {
      alert(`${label} copied to clipboard!`)
    }).catch(err => {
      console.error('Failed to copy:', err)
      alert('Failed to copy to clipboard')
    })
  }

  // Scroll to bottom when messages change
  useEffect(() => {
    if (isAtBottom.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const handleForwardSelect = (chatId: string) => {
    setSelectedForwardChats(prev => 
      prev.includes(chatId) ? prev.filter(id => id !== chatId) : [...prev, chatId]
    )
  }

  const sendForwardedMessage = async () => {
    if (!forwardingMessage || selectedForwardChats.length === 0) return
    setIsSending(true)
    try {
      for (const chatId of selectedForwardChats) {
        await (forwardMessage as any)(chatId, forwardingMessage)
      }
      setForwardingMessage(null)
      setShowForwardSelector(false)
      setSelectedForwardChats([])
      alert('Message forwarded successfully!')
    } catch (err) {
      console.error('Error forwarding message:', err)
      alert('Failed to forward message')
    } finally {
      setIsSending(false)
    }
  }

  // Handle URL parameters for incoming calls
  useEffect(() => {
    if (typeof window === 'undefined') return

    const urlParams = new URLSearchParams(window.location.search)
    const callId = urlParams.get('call')
    const action = urlParams.get('action')

    if (callId) {
      window.dispatchEvent(new CustomEvent('incomingVoiceCall', {
        detail: {
          callId,
          action: action || 'show',
          fromNotification: true,
          timestamp: Date.now()
        }
      }))

      const newUrl = window.location.pathname
      window.history.replaceState({}, '', newUrl)
    }
  }, [])

  // Search users
  useEffect(() => {
    const search = async () => {
      setIsSearching(true)
      const results = await searchUsers(searchTerm.trim())
      setSearchResults(results)
      setIsSearching(false)
    }

    const debounce = setTimeout(search, 300)
    return () => clearTimeout(debounce)
  }, [searchTerm, searchUsers])

  // Search users for group settings
  useEffect(() => {
    const search = async () => {
      setIsGroupSettingsSearching(true)
      const results = await searchUsers(groupSettingsSearchTerm.trim())
      setGroupSettingsSearchResults(results)
      setIsGroupSettingsSearching(false)
    }

    const debounce = setTimeout(search, 300)
    return () => clearTimeout(debounce)
  }, [groupSettingsSearchTerm, searchUsers])

  // Reset search when modal closes
  useEffect(() => {
    if (!showGroupSettings) {
      setGroupSettingsSearchTerm('')
      setGroupSettingsSearchResults([])
    }
  }, [showGroupSettings])

  // Handle starting a direct chat
  const handleStartChat = async (user: ChatUser) => {
    const chatId = await startDirectChat(user)

    if (chatId) {
      setShowNewChat(false)
      setSearchTerm('')
      setSearchResults([])

      const findAndSelectChat = (attempts = 0) => {
        const chat = chats.find(c => c.id === chatId)

        if (chat) {
          selectChat(chat)
        } else if (attempts < 10) {
          setTimeout(() => findAndSelectChat(attempts + 1), 500)
        } else {
          const tempChat = {
            id: chatId,
            type: 'direct' as const,
            participants: [currentUser?.id || '', user.id],
            participantDetails: {
              [currentUser?.id || '']: { name: currentUser?.name || '' },
              [user.id]: { name: user.name }
            },
            admins: [],
            createdBy: currentUser?.id || '',
            createdAt: new Date(),
            unreadCount: {}
          }
          selectChat(tempChat)
        }
      }

      setTimeout(() => findAndSelectChat(0), 300)
    } else {
      console.error('[Groups] Failed to create/get chat')
      alert('Failed to start chat. Please try again.')
    }
  }

  // Handle creating a group
  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedMembers.length === 0) return

    setIsCreatingGroup(true)
    const chatId = await createGroupChat(groupName, selectedMembers)
    setIsCreatingGroup(false)

    if (chatId) {
      setShowNewGroup(false)
      setGroupName('')
      setSelectedMembers([])
      setSearchTerm('')
      setSearchResults([])
      setGroupStep(1)
    }
  }

  const handleAddMembers = async () => {
    if (selectedMembers.length === 0 || !selectedChat) return
    setIsCreatingGroup(true)
    try {
      await addGroupMembers(selectedMembers)
      setSelectedMembers([])
      setShowNewChat(false)
      setShowNewGroup(false)
      setIsAddingMember(false)
      alert('Members added successfully!')
    } catch (err) {
      console.error('Error adding members:', err)
      alert('Failed to add members')
    } finally {
      setIsCreatingGroup(false)
    }
  }

  // Handle sending message moves to ChatWindow via context/props
  const themeColor = currentZone?.themeColor || '#10b981'
  const primaryColor = themeColor

  // Real data extraction for Media Grid
  const mediaMessages = messages.filter(m => m.type === 'image' || m.imageUrl).slice(-6).reverse()
  const [isEditingDesc, setIsEditingDesc] = useState(false)
  const [newGroupDesc, setNewGroupDesc] = useState('')

  return (
    <div className="flex h-screen w-full bg-[#f0f2f5] overflow-hidden fixed inset-0 z-[1000]">
      <div className="flex-1 flex overflow-hidden relative">
        <ChatList 
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onNewChat={() => setShowNewChat(true)}
          onNewGroup={() => setShowNewGroup(true)}
          onShowMyProfile={() => {
            setShowMyProfile(true)
            setIsEditingMyProfile(false)
          }}
          onBack={() => router.push('/home')}
          primaryColor={primaryColor}
        />

        <div className="flex-1 flex flex-col min-w-0 bg-white relative">
          {selectedChat ? (
            <ChatWindow 
              primaryColor={primaryColor}
              onShowGroupSettings={() => setShowGroupSettings(true)}
              onShowDirectChatSettings={() => setShowDirectChatSettings(true)}
              onBackToList={() => selectChat(null)}
              onForward={(msg) => {
                setForwardingMessage(msg)
                setShowForwardSelector(true)
              }}
              onPin={(msgId) => pinMessage(msgId)}
            />
          ) : (
            <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-gray-50/30">
              <div className="w-[180px] h-[180px] bg-white rounded-full flex items-center justify-center mb-8 shadow-sm">
                 <MessageCircle className="w-24 h-24 text-gray-100" />
              </div>
              <h2 className="text-[32px] font-light text-[#41525d] mb-4">Rehearsal Hub</h2>
              <p className="text-[#667781] text-[14px] max-w-[460px] text-center leading-[20px]">
                Welcome to the official LoveWorld Singers Rehearsal Hub.
                <br />
                Connect, collaborate, and rehearsal with your team.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Forward Message Sidebar (Right Slide-in) */}
      <AnimatePresence>
        {showForwardSelector && (
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.25 }}
            className="fixed right-0 top-0 bottom-0 w-full md:w-[380px] z-[120] bg-white border-l border-[#e9edef] flex flex-col shadow-2xl"
          >
            {/* Premium Forward Header - Dynamic Zone Branding */}
            <div className="flex-shrink-0 relative h-[140px] overflow-hidden flex flex-col justify-end px-6 pb-6 shadow-xl">
               {/* Deep Premium Gradient Background based on Zone Color */}
               <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${adjustColor(primaryColor, -30)} 100%)` }} />
               <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,_#ffffff_0%,_transparent_60%)]" />
               <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16" />
               
               <div className="relative z-10 flex items-center gap-4">
                  <button 
                    onClick={() => { setShowForwardSelector(false); setSelectedForwardChats([]); setForwardSearchTerm('') }} 
                    className="w-10 h-10 flex items-center justify-center -ml-2 hover:bg-white/20 rounded-xl transition-all active:scale-90"
                  >
                    <ArrowLeft className="w-6 h-6 text-white" />
                  </button>
                  <div>
                    <h2 className="text-[22px] font-black text-white tracking-tight">Forward To</h2>
                    <p className="text-white/70 text-[13px] font-medium uppercase tracking-widest">Share the moment</p>
                  </div>
               </div>
            </div>

            {/* Premium Search Section */}
            <div className="px-6 py-4 bg-white border-b border-gray-100/50 sticky top-0 z-20">
              <div className="relative group">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                  <Search className="w-[18px] h-[18px] text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                </div>
                <input 
                  type="text" 
                  value={forwardSearchTerm} 
                  onChange={(e) => setForwardSearchTerm(e.target.value)} 
                  placeholder="Search your contacts..." 
                  className="w-full pl-12 pr-4 py-3.5 bg-gray-50/50 hover:bg-gray-100 focus:bg-white rounded-2xl text-[15px] text-[#111b21] transition-all focus:outline-none focus:ring-2 focus:ring-current/20 placeholder:text-gray-400 font-medium"
                  style={{ color: primaryColor }}
                />
              </div>
            </div>

            {/* Selected Chats Ribbon - Ultra Clean Tags */}
            <AnimatePresence>
              {selectedForwardChats.length > 0 && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-6 py-4 bg-indigo-50/30 flex flex-wrap gap-2.5 overflow-hidden border-b border-indigo-100/50"
                >
                  {selectedForwardChats.map(chatId => {
                    const chat = chats.find(c => c.id === chatId)
                    return chat ? (
                      <motion.div 
                        initial={{ scale: 0.8, opacity: 0, x: -10 }} 
                        animate={{ scale: 1, opacity: 1, x: 0 }} 
                        exit={{ scale: 0.8, opacity: 0, x: -10 }}
                        key={chatId} 
                        className="flex items-center gap-2 pl-1 pr-2 py-1 text-[13px] rounded-xl bg-white text-indigo-700 shadow-sm ring-1 ring-indigo-100 hover:ring-indigo-300 transition-all cursor-pointer group"
                      >
                        <SyncAvatar userId={chat.type === 'direct' ? chat.participants.find(id => id !== user?.uid) : undefined} isGroup={chat.type === 'group'} size="w-7 h-7" className="rounded-lg shadow-sm" bgColor={primaryColor} />
                        <span className="max-w-[120px] truncate font-bold text-[#111b21]">{getChatDisplayName(chat)}</span> 
                        <button onClick={() => handleForwardSelect(chatId)} className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all">
                           <X className="w-3.5 h-3.5" />
                        </button>
                      </motion.div>
                    ) : null
                  })}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Chats List - Premium List Items */}
            <div className="flex-1 overflow-y-auto no-scrollbar py-2">
               <div className="px-6 pb-2">
                 <p className="text-[12px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Recent Conversations</p>
                 <div className="space-y-1">
                   {chats.filter(chat => 
                     getChatDisplayName(chat).toLowerCase().includes(forwardSearchTerm.toLowerCase())
                   ).map(chat => {
                     const isSelected = selectedForwardChats.includes(chat.id)
                     const otherUser = chat.type === 'direct' ? chat.participants.find(id => id !== user?.uid) : undefined
                     return (
                       <button 
                         key={chat.id} 
                         onClick={() => handleForwardSelect(chat.id)}
                         className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all group ${isSelected ? 'bg-indigo-50/50 ring-1 ring-indigo-100 shadow-sm' : 'hover:bg-gray-50/80'}`}
                       >
                         <div className="relative">
                           <SyncAvatar 
                             userId={otherUser} 
                             isGroup={chat.type === 'group'} 
                             size="w-14 h-14" 
                             className="rounded-2xl shadow-md transition-transform group-hover:scale-105" 
                             bgColor={isSelected ? primaryColor : '#cbd5e1'}
                             fallbackName={getChatDisplayName(chat)}
                             textClassName="text-xl"
                           />
                           {isSelected && (
                             <motion.div 
                               initial={{ scale: 0 }} animate={{ scale: 1 }}
                               className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-emerald-500 border-2 border-white flex items-center justify-center text-white shadow-lg"
                             >
                               <Check className="w-4 h-4 stroke-[3]" />
                             </motion.div>
                           )}
                         </div>
                         <div className="flex-1 min-w-0 text-left">
                            <h4 className={`text-[17px] font-bold truncate ${isSelected ? 'text-indigo-900' : 'text-[#111b21]'}`}>
                              {getChatDisplayName(chat)}
                            </h4>
                            <p className="text-[13px] text-gray-400 font-medium truncate flex items-center gap-1.5 mt-0.5">
                              {chat.type === 'group' ? (
                                <><Users className="w-3.5 h-3.5" /> {chat.participants.length} Hub Members</>
                              ) : (
                                <><User className="w-3.5 h-3.5" /> Direct Contact</>
                              )}
                            </p>
                         </div>
                       </button>
                     )
                   })}
                 </div>
               </div>
            </div>

            {/* Premium Forward Actions - FAB Style */}
            <div className="relative flex justify-center pb-10 pt-4 bg-gradient-to-t from-white via-white/95 to-transparent">
               <AnimatePresence>
                 {selectedForwardChats.length > 0 && (
                   <motion.button 
                     initial={{ y: 20, opacity: 0, scale: 0.8 }}
                     animate={{ y: 0, opacity: 1, scale: 1 }}
                     exit={{ y: 20, opacity: 0, scale: 0.8 }}
                     onClick={sendForwardedMessage}
                     disabled={isSending}
                     className="px-8 h-16 rounded-2xl text-white shadow-xl flex items-center gap-3 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 z-30"
                     style={{ backgroundColor: primaryColor }}
                   >
                     {isSending ? (
                       <Loader2 className="w-6 h-6 animate-spin" />
                     ) : (
                       <>
                         <span className="font-bold tracking-tight">Forward to {selectedForwardChats.length} {selectedForwardChats.length === 1 ? 'chat' : 'chats'}</span>
                         <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                           <Send className="w-4 h-4 text-white ml-0.5" />
                         </div>
                       </>
                     )}
                   </motion.button>
                 )}
               </AnimatePresence>
               {!isSending && selectedForwardChats.length === 0 && (
                 <div className="flex flex-col items-center gap-2 animate-pulse">
                   <p className="text-gray-400 text-[13px] font-bold uppercase tracking-widest">Select conversations</p>
                   <div className="w-1 h-1 rounded-full bg-gray-300" />
                 </div>
               )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Chat Sidebar (Left Slide-in) */}
      <AnimatePresence>
        {showNewChat && (
          <motion.div 
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed left-0 top-0 bottom-0 w-full md:w-80 lg:w-[380px] z-[60] bg-white border-r border-gray-200 flex flex-col shadow-2xl"
          >
            {/* Header matching WhatsApp's distinct side-panel green/primary block */}
            {/* Premium Header - Dynamic Zone Branding */}
            <div className="flex-shrink-0 relative h-[108px] overflow-hidden flex flex-col justify-end px-6 pb-4 shadow-xl">
               <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${adjustColor(primaryColor, -30)} 100%)` }} />
               <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,_#ffffff_0%,_transparent_60%)]" />
               
               <div className="relative z-10 flex items-center gap-4">
                  <button 
                    onClick={() => { setShowNewChat(false); setSearchTerm(''); setSearchResults([]) }} 
                    className="w-10 h-10 flex items-center justify-center -ml-2 hover:bg-white/20 rounded-xl transition-all active:scale-90"
                  >
                    <ArrowLeft className="w-6 h-6 text-white" />
                  </button>
                  <div>
                    <h2 className="text-[19px] font-bold text-white tracking-tight">New chat</h2>
                    <p className="text-white/70 text-[11px] font-medium uppercase tracking-widest">Start a conversation</p>
                  </div>
               </div>
            </div>
            
            {/* Search Input Area */}
            <div className="p-2 border-b border-gray-100 bg-white">
              <div className="relative bg-[#f0f2f5] rounded-lg">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-500" />
                <input 
                  type="text" 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  placeholder="Search name or number" 
                  className="w-full pl-10 pr-4 py-2 bg-transparent text-sm focus:outline-none placeholder:text-gray-500"
                  autoFocus
                />
              </div>
            </div>
            
            {/* Results Area */}
            <div className="flex-1 overflow-y-auto bg-white">
              {isSearching ? (
                <div className="py-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto" style={{ color: primaryColor }} /></div>
              ) : searchResults.length === 0 ? (
                <div className="py-12 text-center text-gray-500 text-sm">{searchTerm ? `No results found for "${searchTerm}"` : ''}</div>
              ) : (
                <div className="flex flex-col mt-2">
                  <div className="px-5 py-3 text-[#008069] text-base font-normal tracking-wide">Contacts on Rehearsal Hub</div>
                  {searchResults.map(user => (
                    <button 
                      key={user.id} 
                      onClick={() => handleStartChat(user)} 
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#f5f6f6] text-left transition-colors group"
                    >
                      <div className="pl-1">
                        <SyncAvatar 
                          userId={user.id}
                          initialAvatar={user.avatar}
                          fallbackName={user.name}
                          bgColor={primaryColor}
                          size="w-[49px] h-[49px]"
                          className="rounded-full overflow-hidden"
                        />
                      </div>
                      <div className="flex-1 min-w-0 border-b border-[#f2f2f2] group-last:border-none pb-3 pt-1 flex flex-col justify-center">
                        <p className="text-[17px] text-[#111b21] truncate leading-tight">{user.name}</p>
                        {user.zoneName && <p className="text-[13px] text-[#667781] truncate mt-0.5">{user.zoneName}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Group Sidebar (Left Slide-in) */}
      <AnimatePresence>
        {showNewGroup && (
          <motion.div 
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed left-0 top-0 bottom-0 w-full md:w-80 lg:w-[380px] z-[60] bg-[#f0f2f5] border-r border-gray-200 flex flex-col shadow-2xl"
          >
            {groupStep === 1 ? (
              <>
                {/* Premium Header - Dynamic Zone Branding */}
                <div className="flex-shrink-0 relative h-[108px] overflow-hidden flex flex-col justify-end px-6 pb-4 shadow-xl">
                   <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${adjustColor(primaryColor, -30)} 100%)` }} />
                   <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,_#ffffff_0%,_transparent_60%)]" />
                   
                   <div className="relative z-10 flex items-center gap-4">
                      <button 
                        onClick={() => setShowNewGroup(false)} 
                        className="w-10 h-10 flex items-center justify-center -ml-2 hover:bg-white/20 rounded-xl transition-all active:scale-90"
                      >
                        <ArrowLeft className="w-6 h-6 text-white" />
                      </button>
                      <div>
                        <h2 className="text-[19px] font-bold text-white tracking-tight">New group</h2>
                        <p className="text-white/70 text-[11px] font-medium uppercase tracking-widest">Create a hub</p>
                      </div>
                   </div>
                </div>
                
                {/* Body Phase 1 */}
                <div className="flex-1 bg-[#f0f2f5] p-4 flex flex-col items-center">
                  <div className="w-[100px] h-[100px] rounded-full mx-auto mb-8 flex items-center justify-center bg-gray-200 mt-4 shadow-sm relative group cursor-pointer overflow-hidden">
                    <Camera className="w-8 h-8 text-gray-400 group-hover:opacity-0 transition-opacity" />
                    <label className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-[11px] uppercase tracking-wider text-center px-2">
                       <Camera className="w-6 h-6 mb-1" />
                       Add group icon
                       <input type="file" className="hidden" accept="image/*" />
                    </label>
                  </div>
                  
                  <div className="w-full bg-white rounded-lg shadow-sm">
                    <input 
                      type="text" 
                      value={groupName} 
                      onChange={(e) => setGroupName(e.target.value)} 
                      placeholder="Group subject" 
                      className="w-full px-4 py-4 bg-transparent text-[#111b21] border-b-2 border-transparent focus:border-b-2 transition-colors focus:outline-none" 
                      style={{ borderBottomColor: groupName ? primaryColor : 'transparent' }}
                      autoFocus 
                    />
                  </div>
                </div>

                {/* FAB Next Button Phase 1 */}
                <div className="p-4 bg-[#f0f2f5] flex justify-center pb-8">
                  <AnimatePresence>
                    {groupName.trim() && (
                      <motion.button 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        onClick={() => setGroupStep(2)} 
                        className="w-12 h-12 rounded-full text-white shadow-lg flex items-center justify-center transition-transform hover:scale-105"
                        style={{ backgroundColor: primaryColor }}
                      >
                         <ArrowLeft className="w-6 h-6 rotate-180" />
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <>
                {/* Header Phase 2 */}
                <div className="flex-shrink-0 pt-12 pb-4 px-4 text-white flex items-end gap-4 h-[108px]" style={{ backgroundColor: primaryColor }}>
                  <button 
                    onClick={() => setGroupStep(1)} 
                    className="w-10 h-10 flex items-center justify-center -ml-2 hover:bg-white/20 rounded-full transition-colors mb-0.5"
                  >
                    <ArrowLeft className="w-6 h-6" />
                  </button>
                  <div className="flex flex-col mb-1">
                     <h2 className="text-[19px] font-medium leading-[22px] mb-2">Add members</h2>
                     <p className="text-[13px] text-white/80 leading-[15px]">{selectedMembers.length} {selectedMembers.length === 1 ? 'contact' : 'contacts'} selected</p>
                  </div>
                </div>

                {/* Selected Members Ribbon Phase 2 */}
                <div className="bg-white px-4 py-3 border-b border-[#f2f2f2] flex flex-wrap gap-2 min-h-[60px] content-start shadow-sm z-10">
                  {selectedMembers.length > 0 ? selectedMembers.map(m => (
                    <motion.div 
                      initial={{ scale: 0.8, opacity: 0 }} 
                      animate={{ scale: 1, opacity: 1 }} 
                      key={m.id} 
                      className="flex items-center gap-1.5 pl-1 pr-1.5 py-1 text-[13px] rounded-full bg-[#f0f2f5] text-[#111b21]"
                    >
                      <SyncAvatar userId={m.id} initialAvatar={m.avatar} fallbackName={m.name} size="w-6 h-6" className="rounded-full" bgColor={primaryColor} />
                      <span className="max-w-[80px] truncate">{m.name.split(' ')[0]}</span> 
                      <button onClick={() => setSelectedMembers(prev => prev.filter(p => p.id !== m.id))} className="w-5 h-5 flex items-center justify-center text-[#667781] hover:text-[#111b21]">
                         <X className="w-4 h-4" />
                      </button>
                    </motion.div>
                  )) : (
                    <span className="text-[#667781] text-[15px] self-center">Search for members</span>
                  )}
                </div>

                {/* Search Input Area */}
                <div className="p-2 border-b border-gray-100 bg-white">
                  <div className="relative bg-[#f0f2f5] rounded-lg">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-500" />
                    <input 
                      type="text" 
                      value={searchTerm} 
                      onChange={(e) => setSearchTerm(e.target.value)} 
                      placeholder="Type contact name" 
                      className="w-full pl-10 pr-4 py-2 bg-transparent text-sm focus:outline-none placeholder:text-gray-500"
                    />
                  </div>
                </div>

                {/* Results Area */}
                <div className="flex-1 overflow-y-auto bg-white">
                   {searchResults.filter(u => !selectedMembers.find(m => m.id === u.id)).map(user => (
                     <button 
                       key={user.id} 
                       onClick={() => setSelectedMembers(prev => [...prev, user])} 
                       className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#f5f6f6] text-left transition-colors group"
                     >
                       <div className="pl-1">
                          <SyncAvatar userId={user.id} initialAvatar={user.avatar} fallbackName={user.name} bgColor={primaryColor} size="w-[49px] h-[49px]" className="rounded-full" />
                       </div>
                       <div className="flex-1 min-w-0 border-b border-[#f2f2f2] group-last:border-none pb-3 pt-1 flex flex-col justify-center">
                         <p className="text-[17px] text-[#111b21] truncate leading-tight">{user.name}</p>
                         {user.zoneName && <p className="text-[13px] text-[#667781] truncate mt-0.5">{user.zoneName}</p>}
                       </div>
                     </button>
                   ))}
                </div>

                {/* FAB Create Button Phase 2 */}
                <div className="p-4 bg-[#f0f2f5] flex justify-center pb-8 border-t border-[#e9edef]">
                  <AnimatePresence>
                    {selectedMembers.length > 0 && (
                      <motion.button 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        onClick={isAddingMember ? handleAddMembers : handleCreateGroup} 
                        disabled={isCreatingGroup}
                        className="w-12 h-12 rounded-full text-white shadow-lg flex items-center justify-center transition-transform hover:scale-105 disabled:opacity-70 disabled:hover:scale-100"
                        style={{ backgroundColor: '#00a884' }} // Classic WhatsApp Create Checkmark Color
                      >
                         {isCreatingGroup ? <Loader2 className="w-6 h-6 animate-spin" /> : <Check className="w-6 h-6" />}
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image Viewer */}
      {viewingImage && (
        <div className="fixed inset-0 z-[300] bg-black/95 flex flex-col" onClick={() => setViewingImage(null)}>
          <div className="flex items-center justify-between p-4">
            <button onClick={() => setViewingImage(null)} className="p-2 hover:bg-white/10 rounded-full text-white"><X className="w-6 h-6" /></button>
            <button onClick={async (e) => {
              e.stopPropagation()
              try {
                const response = await fetch(viewingImage!)
                const blob = await response.blob()
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `image_${Date.now()}.jpg`
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
              } catch (err) { window.open(viewingImage!, '_blank') }
            }} className="p-2 hover:bg-white/10 rounded-full text-white"><Download className="w-6 h-6" /></button>
          </div>
          <div className="flex-1 flex items-center justify-center p-4">
            <img src={viewingImage} alt="" className="max-w-full max-h-full object-contain" onClick={(e) => e.stopPropagation()} />
          </div>
        </div>
      )}

      {/* Right Sidebar (Group Info / Contact Info - Right Slide-in) */}
      <AnimatePresence>
        {(showGroupSettings || showDirectChatSettings) && (
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed right-0 top-0 bottom-0 w-full md:w-80 lg:w-[400px] z-[80] bg-[#f0f2f5] border-l border-gray-200 flex flex-col shadow-2xl"
          >
            {/* Sidebar Header */}
            {/* Premium Parallax Header */}
            {/* Premium Header - Indigo/Emerald Overhaul */}
            <div className="flex-shrink-0 relative h-[108px] overflow-hidden flex flex-col justify-end px-6 pb-4 shadow-xl z-20">
               <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${adjustColor(primaryColor, -30)} 100%)` }} />
               <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,_#ffffff_0%,_transparent_60%)]" />
               
               <div className="relative z-10 flex items-center gap-4">
                  <button 
                    onClick={() => { setShowGroupSettings(false); setShowDirectChatSettings(false); }} 
                    className="w-10 h-10 flex items-center justify-center -ml-2 hover:bg-white/20 rounded-xl transition-all active:scale-90"
                  >
                    <X className="w-6 h-6 text-white" />
                  </button>
                  <div>
                    <h2 className="text-[19px] font-bold text-white tracking-tight">
                      {showGroupSettings ? 'Group info' : (viewingProfileData?.first_name ? `${viewingProfileData.first_name}` : 'Contact info')}
                    </h2>
                    <p className="text-white/70 text-[11px] font-medium uppercase tracking-widest">Profile Details</p>
                  </div>
               </div>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar relative bg-[#f0f2f5]">
                {/* Hero Section (Avatar & Name) - Parallax Upgrade */}
                <div className="bg-white px-7 py-12 mb-3 flex flex-col items-center shadow-sm relative overflow-hidden group">
                   {/* Premium Mesh Gradient Background */}
                   <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-indigo-50/50 via-white to-emerald-50/50" />
                   
                   <div className="w-[200px] h-[200px] mb-6 relative z-10 transition-all duration-700 ease-in-out group-hover:scale-[1.05] group-hover:rotate-1">
                     <SyncAvatar 
                       userId={showDirectChatSettings ? selectedChat?.participants.find(id => id !== user?.uid) : undefined} 
                       size="w-full h-full" 
                       className="rounded-full overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.15)] ring-4 ring-white"
                       bgColor={primaryColor}
                       initialAvatar={selectedChat ? getChatAvatar(selectedChat) : undefined}
                       fallbackName={selectedChat ? getChatDisplayName(selectedChat) : '?'}
                       isGroup={showGroupSettings}
                     />
                     {showGroupSettings && isGroupCreator() && (
                       <div className="absolute inset-0 bg-black/50 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 cursor-pointer text-white text-[12px] font-bold uppercase tracking-[0.2em] text-center px-4 backdrop-blur-[3px] scale-95 group-hover:scale-100">
                         <Camera className="w-10 h-10 mb-2 transform transition-transform group-hover:-translate-y-1" />
                         <span>Update Icon</span>
                       </div>
                     )}
                   </div>
                   
                   <div className="text-center w-full max-w-sm z-10">
                     {showGroupSettings && isRenaming ? (
                        <div className="flex flex-col gap-3">
                          <input 
                            type="text" 
                            value={newGroupName} 
                            onChange={(e) => setNewGroupName(e.target.value)}
                            className="text-[28px] font-black text-[#111b21] border-b-4 border-current bg-transparent text-center focus:outline-none w-full py-2 selection:bg-indigo-100"
                            style={{ color: primaryColor }}
                            autoFocus
                            onKeyDown={async (e) => {
                              if (e.key === 'Enter') {
                                 const success = await renameGroup(newGroupName)
                                 if (success) {
                                   setIsRenaming(false)
                                 }
                                setIsRenaming(false);
                              }
                              if (e.key === 'Escape') setIsRenaming(false);
                            }}
                          />
                          <div className="flex items-center justify-center gap-4">
                            <button onClick={async () => { await renameGroup(newGroupName); setIsRenaming(false); }} className="text-[13px] font-bold bg-emerald-500 text-white px-4 py-1.5 rounded-full shadow-lg hover:shadow-emerald-200 transition-all">Save Change</button>
                            <button onClick={() => setIsRenaming(false)} className="text-[13px] font-bold text-gray-400 hover:text-gray-600">Cancel</button>
                          </div>
                        </div>
                     ) : (
                       <div className="flex flex-col items-center">
                         <div className="flex items-center justify-center gap-3 mb-2 group/name">
                           <h3 className="text-[28px] font-black text-[#111b21] tracking-tight truncate leading-tight">{selectedChat ? getChatDisplayName(selectedChat) : ''}</h3>
                           {showGroupSettings && isGroupCreator() && (
                             <button 
                               onClick={() => { setIsRenaming(true); setNewGroupName(getChatDisplayName(selectedChat!)) }}
                               className="p-2 opacity-0 group-hover/name:opacity-100 hover:bg-gray-100 rounded-full transition-all scale-75 group-hover/name:scale-100"
                             >
                               <Edit3 className="w-5 h-5 text-gray-400 hover:text-indigo-600 transition-colors" />
                             </button>
                           )}
                         </div>
                         <div className="flex items-center gap-2 px-4 py-1.5 bg-indigo-50/50 rounded-full border border-indigo-100 shadow-sm">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <p className="text-[14px] text-indigo-700 font-bold tracking-wide uppercase">
                              {showGroupSettings ? `${selectedChat?.participants.length} MEMBERS` : (viewingProfileData?.designation || 'Hub Member')}
                            </p>
                         </div>
                       </div>
                     )}
                   </div>
                </div>

                {/* Description Section with Inline Edit (Premium) */}
                <div className="bg-white px-7 py-8 mb-3 shadow-sm border-b border-gray-100 group/desc relative">
                   <div className="flex items-center justify-between mb-4">
                      <label className="text-[12px] uppercase tracking-[0.2em] font-black" style={{ color: primaryColor }}>
                        {showGroupSettings ? 'Group description' : 'About'}
                      </label>
                      {showGroupSettings && isGroupCreator() && (
                        <button 
                          onClick={() => { setIsEditingDesc(true); setNewGroupDesc(selectedChat?.description || '') }}
                          className="opacity-0 group-hover/desc:opacity-100 p-1.5 hover:bg-gray-50 rounded-lg transition-all"
                        >
                           <Edit3 className="w-4 h-4 text-gray-400" />
                        </button>
                      )}
                   </div>
                   
                   {isEditingDesc ? (
                      <div className="space-y-3">
                         <textarea 
                           value={newGroupDesc}
                           onChange={(e) => setNewGroupDesc(e.target.value)}
                           className="w-full p-3 bg-gray-50 rounded-xl border-2 border-gray-200 focus:border-current focus:outline-none text-[16px] min-h-[100px]"
                           style={{ color: primaryColor }}
                           autoFocus
                         />
                         <div className="flex gap-2">
                            <button 
                              onClick={async () => {
                                 await updateGroupDescription(newGroupDesc)
                                 setIsEditingDesc(false)
                              }}
                              className="px-4 py-1.5 bg-emerald-500 text-white rounded-full text-[13px] font-bold shadow-md"
                            >
                              Save
                            </button>
                            <button onClick={() => setIsEditingDesc(false)} className="px-4 py-1.5 text-gray-400 text-[13px] font-bold">Cancel</button>
                         </div>
                      </div>
                   ) : (
                     <p className="text-[17px] text-[#3b4a54] leading-[1.6] font-medium">
                       {showGroupSettings ? (selectedChat?.description || 'No description yet.') : (viewingProfileData?.designation || 'Dedicated to the Loveworld Singers Rehearsal Hub.')}
                     </p>
                   )}
                   
                   <div className="mt-4 flex items-center gap-2 text-[13px] text-[#667781] font-semibold">
                      <Clock className="w-4 h-4" />
                      <span>{showGroupSettings ? `Created by ${selectedChat?.participantDetails?.[selectedChat.createdBy]?.name || 'Admin'}` : `Joined ${new Date(viewingProfileData?.created_at || Date.now()).toLocaleDateString()}`}</span>
                   </div>
                </div>

                {/* High-Fidelity Interaction Cards (Real Data) */}
                <div className="bg-white mb-3 shadow-sm border-y border-gray-100">
                   {/* Real Media Section */}
                   <button className="px-7 py-6 w-full flex flex-col hover:bg-gray-50 transition-all group/media border-b border-gray-50">
                      <div className="flex items-center justify-between w-full mb-5">
                        <span className="text-[14px] font-black uppercase tracking-widest" style={{ color: primaryColor }}>Media, links, and docs</span>
                        <div className="flex items-center gap-1 text-[14px] font-bold text-[#667781]">
                           <span className="bg-gray-100 px-2 py-0.5 rounded-md">{mediaMessages.length}</span>
                        </div>
                      </div>
                      
                      {mediaMessages.length > 0 ? (
                        <div className="grid grid-cols-3 gap-3 w-full">
                           {mediaMessages.map((msg, i) => (
                             <div 
                               key={msg.id} 
                               onClick={(e) => { e.stopPropagation(); setViewingImage(msg.imageUrl || null) }}
                               className="aspect-square bg-gray-50 rounded-xl border border-gray-100 overflow-hidden relative group/thumb shadow-sm hover:shadow-md transition-all cursor-pointer"
                             >
                                <img src={msg.imageUrl} alt="" className="w-full h-full object-cover transition-transform group-hover/thumb:scale-110" />
                                <div className="absolute inset-0 bg-black/0 group-hover/thumb:bg-black/10 transition-colors" />
                             </div>
                           ))}
                        </div>
                      ) : (
                        <div className="w-full py-6 flex flex-col items-center justify-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                           <ImageIcon className="w-8 h-8 text-gray-300 mb-2" />
                           <p className="text-[13px] text-gray-400 font-medium italic">No media shared yet</p>
                        </div>
                      )}
                   </button>

                   {/* WhatsApp-Standard Feature Rows */}
                   <div className="divide-y divide-gray-50">
                      <div className="px-7 py-5 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition-colors">
                         <div className="flex items-center gap-4">
                            <div className="p-2.5 bg-emerald-50 rounded-xl"><Check className="w-5 h-5 text-emerald-600" /></div>
                            <div>
                               <p className="text-[16px] font-bold text-[#111b21]">Encryption</p>
                               <p className="text-[13px] text-[#667781] font-medium">Messages are end-to-end encrypted</p>
                            </div>
                         </div>
                      </div>
                    </div>
                 </div>

                {/* Members Section (Groups only) */}
                {showGroupSettings && selectedChat?.type === 'group' && (
                  <div className="bg-white px-7 py-6 mb-2 shadow-sm border-b border-gray-100">
                     <div className="flex items-center justify-between mb-6">
                        <h4 className="text-[16px] text-[#111b21] font-bold">{selectedChat.participants.length} members</h4>
                        <button 
                          onClick={() => setShowGroupMemberSearch(!showGroupMemberSearch)} 
                          className="text-[#667781] hover:bg-gray-100 p-2 rounded-full transition-all active:scale-90"
                        >
                          <Search className="w-5 h-5"/>
                        </button>
                     </div>
                     
                     {showGroupMemberSearch && (
                       <div className="mb-6 relative bg-[#f0f2f5] rounded-xl p-2 flex items-center shadow-inner">
                         <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-500" />
                         <input
                           type="text"
                           value={groupSettingsSearchTerm}
                           onChange={(e) => setGroupSettingsSearchTerm(e.target.value)}
                           placeholder="Search members..."
                           className="w-full pl-8 pr-4 py-1 bg-transparent text-sm focus:outline-none placeholder:text-gray-500 text-[#111b21]"
                           autoFocus
                         />
                         {groupSettingsSearchTerm && (
                           <button onClick={() => setGroupSettingsSearchTerm('')} className="p-1 hover:bg-gray-200 rounded-full text-gray-500">
                             <X className="w-4 h-4" />
                           </button>
                         )}
                       </div>
                     )}

                     <div className="space-y-5">
                       {isGroupCreator() && (
                         <button 
                           onClick={() => { 
                             setIsAddingMember(true);
                             setShowNewChat(true); 
                             setShowNewGroup(false); 
                           }} 
                           className="w-full flex items-center gap-4 group p-2 -m-2 rounded-2xl hover:bg-gray-50 transition-all active:scale-[0.98]"
                         >
                            <div className="w-[45px] h-[45px] rounded-full flex items-center justify-center bg-[#00a884] text-white shadow-md transition-transform group-hover:rotate-12"><UserPlus className="w-6 h-6"/></div>
                            <span className="text-[17px] text-[#111b21] font-semibold">Add member</span>
                         </button>
                       )}

                       {selectedChat.participants
                         .filter(pid => {
                           if (!groupSettingsSearchTerm) return true;
                           const name = selectedChat.participantDetails?.[pid]?.name || 'Member';
                           return name.toLowerCase().includes(groupSettingsSearchTerm.toLowerCase());
                         })
                         .map(pid => (
                         <div key={pid} className="flex items-center gap-4 group cursor-pointer" onClick={() => setShowUserProfile(pid)}>
                           <div className="relative">
                             <SyncAvatar userId={pid} size="w-[45px] h-[45px]" className="rounded-full shadow-md ring-2 ring-white" bgColor={primaryColor} />
                             {selectedChat.admins.includes(pid) && (
                               <div className="absolute -bottom-1 -right-1 bg-[#00a884] text-white p-0.5 rounded-full border-2 border-white">
                                 <Check className="w-2.5 h-2.5 font-bold" />
                               </div>
                             )}
                           </div>
                           <div className="flex-1 min-w-0 border-b border-gray-50 group-last:border-none pb-4 pt-1 flex items-center justify-between">
                              <div className="min-w-0">
                                <p className="text-[17px] text-[#111b21] truncate font-semibold group-hover:text-current transition-colors" style={{} as any}>
                                  {selectedChat.participantDetails?.[pid]?.name || 'Member'}
                                  {pid === user?.uid && <span className="ml-2 text-[12px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-lg">You</span>}
                                </p>
                                {selectedChat.admins.includes(pid) && (
                                  <span className="inline-block mt-0.5 text-[10px] bg-emerald-50 text-emerald-600 font-black uppercase tracking-widest px-1.5 py-0.5 rounded border border-emerald-100">Admin</span>
                                )}
                              </div>
                              {isGroupCreator() && pid !== user?.uid && (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); removeGroupMember(pid); }} 
                                  className="p-2 opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-50 rounded-full transition-all active:scale-90"
                                  title="Remove member"
                                >
                                  <UserMinus className="w-5 h-5" />
                                </button>
                              )}
                           </div>
                         </div>
                       ))}
                     </div>
                  </div>
                )}

                {/* Actions Section */}
                <div className="bg-white px-2 py-2 mb-10 shadow-sm">
                   {showGroupSettings ? (
                     <Fragment>
                       <button 
                         onClick={() => { if(confirm('Leave group?')) leaveGroup(); setShowGroupSettings(false); }} 
                         className="w-full px-5 py-4 flex items-center gap-4 text-[#ea0038] hover:bg-red-50/50 transition-colors text-left font-semibold"
                       >
                         <LogOut className="w-5 h-5" />
                         <span className="text-[16px]">Leave group</span>
                       </button>
                       {isGroupCreator() && (
                         <button 
                           onClick={() => { if(confirm('Delete group?')) deleteGroup(); setShowGroupSettings(false); }} 
                           className="w-full px-5 py-4 flex items-center gap-4 text-[#ea0038] hover:bg-red-50/50 transition-colors text-left font-semibold"
                         >
                           <Trash2 className="w-5 h-5" />
                           <span className="text-[16px]">Delete group</span>
                         </button>
                       )}
                     </Fragment>
                   ) : (
                     <Fragment>
                       <button 
                         onClick={() => handleCopyText(viewingProfileData?.phone_number)}
                         className="w-full px-5 py-4 flex items-center gap-4 text-[#111b21] hover:bg-gray-50 transition-colors text-left font-semibold"
                       >
                         <Copy className="w-5 h-5 text-[#8696a0]" />
                         <span className="text-[16px]">Copy phone number</span>
                       </button>
                       <button 
                         onClick={() => { if(confirm('Clear chat history?')) alert('Feature coming soon!'); setShowDirectChatSettings(false); }} 
                         className="w-full px-5 py-4 flex items-center gap-4 text-[#ea0038] hover:bg-red-50/50 transition-colors text-left font-semibold"
                       >
                         <Trash2 className="w-5 h-5" />
                         <span className="text-[16px]">Clear chat</span>
                       </button>
                    </Fragment>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      {/* Contact Profile Sidebar (Right Slide-in) */}
      <AnimatePresence>
        {showUserProfile && (
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed right-0 top-0 bottom-0 w-full md:w-80 lg:w-[400px] z-[90] bg-[#f0f2f5] border-l border-gray-200 flex flex-col shadow-2xl"
          >
            {/* Premium Parallax Header */}
            <div className="flex-shrink-0 bg-white border-b border-gray-100 px-4 h-[64px] flex items-center justify-between z-20 shadow-sm sticky top-0">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setShowUserProfile(null)} 
                  className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-full transition-all active:scale-95"
                  style={{ color: primaryColor }}
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex flex-col">
                  <h2 className="text-[19px] font-bold text-[#111b21] leading-tight">
                    {viewingProfileData?.first_name ? `${viewingProfileData.first_name}'s Profile` : 'Contact info'}
                  </h2>
                  <p className="text-[12px] text-emerald-600 font-bold uppercase tracking-widest">
                    {viewingProfileData?.designation || 'Hub Member'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar bg-[#f0f2f5]">
              {!viewingProfileData ? (
                <div className="flex items-center justify-center p-20">
                  <Loader2 className="w-10 h-10 animate-spin" style={{ color: primaryColor }} />
                </div>
              ) : (
                <Fragment>
                  {/* Hero Section - Parallax Upgrade */}
                  <div className="bg-white px-7 py-12 mb-3 flex flex-col items-center shadow-sm border-b border-gray-100 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-indigo-50/50 via-white to-emerald-50/50" />
                    <div className="w-[180px] h-[180px] mb-6 rounded-full overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.15)] ring-4 ring-white flex items-center justify-center bg-gray-100 z-10 transition-transform duration-700 group-hover:scale-[1.05] group-hover:rotate-1">
                      {viewingProfileData.profile_image_url ? (
                        <img src={viewingProfileData.profile_image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white text-6xl font-bold" style={{ backgroundColor: primaryColor }}>
                          {viewingProfileData.first_name?.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="text-center z-10">
                      <h3 className="text-[28px] font-black text-[#111b21] tracking-tight">{viewingProfileData.first_name} {viewingProfileData.last_name}</h3>
                      <div className="flex items-center justify-center gap-2 mt-2 px-4 py-1.5 bg-gray-50 rounded-full border border-gray-100 shadow-sm mx-auto w-fit">
                         <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                         <p className="text-[14px] text-[#667781] font-bold tracking-wide uppercase">{viewingProfileData.designation || 'Member'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Media Section Wrapper */}
                  <div className="bg-white mb-3 shadow-sm border-b border-gray-100">
                    <div className="w-full px-7 py-4 flex items-center justify-between border-b border-gray-50">
                       <span className="text-[14px] font-bold text-[#667781] uppercase tracking-wider">Media, links and docs</span>
                       <div className="flex items-center gap-2">
                          <span className="text-[14px] text-[#667781] font-medium">{mediaMessages.length}</span>
                       </div>
                    </div>

                    <div className="w-full p-4">
                       {mediaMessages.length > 0 ? (
                         <div className="grid grid-cols-3 gap-2">
                            {mediaMessages.map((msg, i) => (
                              <div 
                                key={msg.id} 
                                onClick={(e) => { e.stopPropagation(); setViewingImage(msg.imageUrl || null) }}
                                className="aspect-square bg-gray-50 rounded-xl border border-gray-100 overflow-hidden relative group/thumb shadow-sm hover:shadow-md transition-all cursor-pointer"
                              >
                                 <img src={msg.imageUrl} alt="" className="w-full h-full object-cover transition-transform group-hover/thumb:scale-110" />
                                 <div className="absolute inset-0 bg-black/0 group-hover/thumb:bg-black/10 transition-colors" />
                              </div>
                            ))}
                         </div>
                       ) : (
                         <div className="w-full py-6 flex flex-col items-center justify-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                            <ImageIcon className="w-8 h-8 text-gray-300 mb-2" />
                            <p className="text-[13px] text-gray-400 font-medium italic">No media shared yet</p>
                         </div>
                       )}
                    </div>

                    <div className="divide-y divide-gray-50">
                        <div className="px-7 py-5 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition-colors">
                           <div className="flex items-center gap-4">
                              <div className="p-2.5 bg-emerald-50 rounded-xl"><Check className="w-5 h-5 text-emerald-600" /></div>
                              <div>
                                 <p className="text-[16px] font-bold text-[#111b21]">Encryption</p>
                                 <p className="text-[13px] text-[#667781] font-medium">Messages are end-to-end encrypted</p>
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* Info Sections */}
                  <div className="bg-white px-7 py-8 mb-3 shadow-sm border-y border-gray-100 space-y-8">
                    <div>
                      <label className="text-[12px] uppercase tracking-[0.2em] font-black mb-3 block" style={{ color: primaryColor }}>About</label>
                      <p className="text-[17px] text-[#3b4a54] leading-[1.6] font-medium">{viewingProfileData.designation || 'Available'}</p>
                    </div>
                    
                    <div>
                      <label className="text-[13px] uppercase tracking-wider font-bold mb-3 block" style={{ color: primaryColor }}>Email address</label>
                      <div 
                        className="flex items-center gap-4 cursor-pointer hover:bg-gray-50 p-3 -m-3 rounded-2xl transition-all"
                        onClick={() => handleCopyText(viewingProfileData.email, 'Email')}
                      >
                        <div className="p-2 bg-gray-50 rounded-lg"><Mail className="w-5 h-5 text-gray-400" /></div>
                        <span className="text-[16px] text-[#111b21] font-semibold truncate">{viewingProfileData.email}</span>
                      </div>
                    </div>

                    {viewingProfileData.phone_number && (
                      <div>
                        <label className="text-[13px] uppercase tracking-wider font-bold mb-3 block" style={{ color: primaryColor }}>Phone number</label>
                        <div 
                          className="flex items-center gap-4 cursor-pointer hover:bg-gray-50 p-3 -m-3 rounded-2xl transition-all"
                          onClick={() => handleCopyText(viewingProfileData.phone_number)}
                        >
                          <div className="p-2 bg-gray-50 rounded-lg"><Phone className="w-5 h-5 text-gray-400" /></div>
                          <span className="text-[16px] text-[#111b21] font-semibold">{viewingProfileData.phone_number}</span>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="text-[13px] uppercase tracking-wider font-bold mb-3 block" style={{ color: primaryColor }}>Zone</label>
                      <div className="flex items-center gap-4 p-1">
                        <div className="p-2 bg-gray-50 rounded-lg"><Users className="w-5 h-5 text-gray-400" /></div>
                        <span className="text-[16px] text-[#111b21] font-semibold">{viewingProfileData.zone || 'No Zone assigned'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Common Groups (Placeholder) */}
                  <div className="bg-white px-7 py-6 mb-2 shadow-sm border-b border-gray-100">
                    <label className="text-[13px] uppercase tracking-wider font-bold mb-4 block" style={{ color: primaryColor }}>Groups in common</label>
                    <div className="flex items-center gap-4 opacity-40">
                       <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 font-bold">?</div>
                       <span className="text-[15px] italic text-gray-500">No common groups</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="bg-white px-3 py-2 shadow-sm mb-10">
                    <button 
                      onClick={() => { if(confirm('Delete contact?')) alert('Contact deleted'); setShowUserProfile(null); }} 
                      className="w-full px-5 py-4 flex items-center gap-4 text-[#ea0038] hover:bg-red-50/50 transition-colors text-left font-semibold"
                    >
                      <Trash2 className="w-5 h-5" />
                      <span className="text-[16px]">Delete contact</span>
                    </button>
                    <button 
                      onClick={() => { if(confirm(`Block ${viewingProfileData.first_name}?`)) alert('User blocked'); setShowUserProfile(null); }} 
                      className="w-full px-5 py-4 flex items-center gap-4 text-[#ea0038] hover:bg-red-50/50 transition-colors text-left font-semibold"
                    >
                      <LogOut className="w-5 h-5" />
                      <span className="text-[16px]">Block {viewingProfileData.first_name}</span>
                    </button>
                  </div>
                </Fragment>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* My Profile Sidebar (Left Slide-in) */}
      <AnimatePresence>
        {showMyProfile && (
          <motion.div 
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed left-0 top-0 bottom-0 w-full md:w-80 lg:w-[380px] z-[70] bg-[#f0f2f5] border-r border-gray-200 flex flex-col shadow-2xl"
          >
            {/* Premium Parallax Header */}
            {/* Premium Header - Indigo/Emerald Overhaul */}
            <div className="flex-shrink-0 relative h-[108px] overflow-hidden flex flex-col justify-end px-6 pb-4 shadow-xl z-20">
               <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${adjustColor(primaryColor, -30)} 100%)` }} />
               <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,_#ffffff_0%,_transparent_60%)]" />
               
               <div className="relative z-10 flex items-center gap-4">
                  <button 
                    onClick={() => setShowMyProfile(false)} 
                    className="w-10 h-10 flex items-center justify-center -ml-2 hover:bg-white/20 rounded-xl transition-all active:scale-90"
                  >
                    <ArrowLeft className="w-6 h-6 text-white" />
                  </button>
                  <div>
                    <h2 className="text-[19px] font-bold text-white tracking-tight">My Profile</h2>
                    <p className="text-white/70 text-[11px] font-medium uppercase tracking-widest">Personalize Identity</p>
                  </div>
               </div>
            </div>
            
            {/* Profile Body */}
            <div className="flex-1 overflow-y-auto no-scrollbar bg-[#f0f2f5]">
              {/* Profile Image Section - Parallax Upgrade */}
              <div className="py-12 flex flex-col items-center bg-white border-b border-gray-100 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-indigo-50/50 via-white to-emerald-50/50" />
                <div className="relative w-[200px] h-[200px] group cursor-pointer z-10 transition-all duration-700 group-hover:scale-[1.05] group-hover:rotate-1">
                  <div className="w-full h-full rounded-full overflow-hidden bg-gray-100 shadow-[0_20px_50px_rgba(0,0,0,0.15)] ring-4 ring-white flex items-center justify-center transition-transform duration-500">
                    {profile?.profile_image_url ? (
                      <img src={String(profile.profile_image_url)} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white text-7xl font-bold" style={{ backgroundColor: primaryColor }}>
                        {profile?.first_name?.charAt(0)}
                      </div>
                    )}
                  </div>
                  
                  {/* Overlay for uploading */}
                  <label className="absolute inset-0 bg-black/40 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 text-white text-[12px] uppercase tracking-widest text-center px-4 font-bold backdrop-blur-[2px]">
                    <Camera className="w-8 h-8 mb-2" />
                    Change Photo
                    <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        setIsUploading(true)
                        try {
                          const res: any = await BackendAPI.upload.file(file)
                          const url = res?.url || res?.data?.url
                          const uId = user?.uid || (user as any)?.id
                          if (url && uId) {
                            await BackendAPI.profiles.update(uId, { profile_image_url: url })
                            await refreshProfile()
                          }
                        } catch (err) {
                           console.error('Profile upload error:', err)
                        } finally {
                          setIsUploading(false)
                        }
                      }
                    }} />
                  </label>
                  
                  {isUploading && (
                    <div className="absolute inset-0 bg-white/60 rounded-full flex items-center justify-center z-20">
                      <Loader2 className="w-10 h-10 animate-spin" style={{ color: primaryColor }} />
                    </div>
                  )}
                </div>
              </div>

              {/* Real Media Section (For My Profile) */}
              <div className="bg-white mb-3 shadow-sm border-b border-gray-100">
                 <button className="px-7 py-6 w-full flex flex-col hover:bg-gray-50 transition-all group/media">
                    <div className="flex items-center justify-between w-full mb-5">
                      <span className="text-[14px] font-black uppercase tracking-widest" style={{ color: primaryColor }}>Your Shared Media</span>
                      <div className="flex items-center gap-1 text-[14px] font-bold text-[#667781]">
                         <span className="bg-gray-100 px-2 py-0.5 rounded-md">{mediaMessages.length}</span>
                         <ChevronRight className="w-5 h-5 group-hover/media:translate-x-1 transition-transform" />
                      </div>
                    </div>
                    
                    {mediaMessages.length > 0 ? (
                      <div className="grid grid-cols-3 gap-3 w-full">
                         {mediaMessages.map((msg, i) => (
                           <div 
                             key={msg.id} 
                             onClick={(e) => { e.stopPropagation(); setViewingImage(msg.imageUrl || null) }}
                             className="aspect-square bg-gray-50 rounded-xl border border-gray-100 overflow-hidden relative group/thumb shadow-sm hover:shadow-md transition-all cursor-pointer"
                           >
                              <img src={msg.imageUrl} alt="" className="w-full h-full object-cover transition-transform group-hover/thumb:scale-110" />
                              <div className="absolute inset-0 bg-black/0 group-hover/thumb:bg-black/10 transition-colors" />
                           </div>
                         ))}
                      </div>
                    ) : (
                      <div className="w-full py-6 flex flex-col items-center justify-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                         <ImageIcon className="w-8 h-8 text-gray-300 mb-2" />
                         <p className="text-[13px] text-gray-400 font-medium italic">No media shared yet</p>
                      </div>
                    )}
                 </button>
              </div>

              {/* Name Section */}
              <div className="bg-white px-7 py-6 shadow-sm mb-4 border-b border-gray-100 group">
                <label className="text-[13px] uppercase tracking-wider font-bold mb-3 block" style={{ color: primaryColor }}>Your Name</label>
                <div className="flex items-center justify-between border-b-2 border-transparent focus-within:border-current transition-colors" style={{ color: primaryColor }}>
                  <input 
                    type="text" 
                    defaultValue={profile?.first_name + ' ' + (profile?.last_name || '')} 
                    className="flex-1 py-1 text-[18px] text-[#111b21] font-semibold focus:outline-none bg-transparent"
                    onBlur={async (e) => {
                      const val = e.target.value.trim()
                      if (!val) return
                      const parts = val.split(' ')
                      const first = parts[0]
                      const last = parts.slice(1).join(' ')
                      if (user?.uid) {
                        await BackendAPI.profiles.update(user.uid, { first_name: first, last_name: last })
                        await refreshProfile()
                      }
                    }} 
                  />
                  <Edit3 className="w-[18px] h-[18px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-[13px] text-gray-500 mt-5 leading-relaxed font-medium">
                  This is not your username or pin. This name will be visible to your Rehearsal Hub contacts.
                </p>
              </div>

              {/* Info Section */}
              <div className="bg-white px-7 py-6 shadow-sm border-y border-gray-100 group">
                <label className="text-[13px] uppercase tracking-wider font-bold mb-3 block" style={{ color: primaryColor }}>About</label>
                <div className="flex items-center justify-between">
                  {isEditingAbout ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={newAboutText}
                        onChange={(e) => setNewAboutText(e.target.value)}
                        className="flex-1 py-1 text-[17px] text-[#111b21] font-medium border-b-2 border-current focus:outline-none bg-transparent"
                        style={{ color: primaryColor }}
                        autoFocus
                        onKeyDown={async (e) => {
                          if (e.key === 'Enter') {
                            if (user?.uid) {
                              await BackendAPI.profiles.update(user.uid, { designation: newAboutText as any });
                              await refreshProfile();
                            }
                            setIsEditingAbout(false);
                          }
                          if (e.key === 'Escape') setIsEditingAbout(false);
                        }}
                      />
                      <button
                        onClick={async () => {
                          if (user?.uid) {
                            await BackendAPI.profiles.update(user.uid, { designation: newAboutText as any });
                            await refreshProfile();
                          }
                          setIsEditingAbout(false);
                        }}
                        className="p-1.5 bg-emerald-500 text-white rounded-full hover:bg-emerald-600 transition-colors"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setIsEditingAbout(false)} className="p-1.5 bg-gray-200 text-gray-600 rounded-full hover:bg-gray-300 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <Fragment>
                      <div className="flex-1 py-1 text-[17px] text-[#111b21] font-medium leading-relaxed">
                        {profile?.designation || 'Member of Loveworld Singers'}
                      </div>
                      <button 
                        onClick={() => { setIsEditingAbout(true); setNewAboutText(profile?.designation || 'Member of Loveworld Singers'); }}
                        className="p-2 hover:bg-gray-50 rounded-full transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Edit3 className="w-[18px] h-[18px] text-gray-400" />
                      </button>
                    </Fragment>
                  )}
                </div>
              </div>

              {/* Zone Info (Locked) */}
              <div className="px-7 py-6 mt-2">
                <label className="text-[13px] text-gray-400 mb-2 block font-bold uppercase tracking-widest">Zone</label>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: primaryColor }} />
                  <div className="text-[17px] font-bold text-[#111b21]">
                    {currentZone?.name || 'Assigned Zone'}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// HELPERS
function adjustColor(color: string, amount: number): string {
  if (!color) return '#10b981'
  if (color.length < 7) return color 
  const hex = color.replace('#', '')
  const num = parseInt(hex, 16)
  const r = Math.max(0, Math.min(255, (num >> 16) + amount))
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount))
  const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}
