'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useZone } from '@/hooks/useZone'
import { BackendAPI } from '@/lib/api-client'
import {
  Chat,
  Message,
  ChatUser,
  ReactionType,
  MessageAttachment,
  StatusUpdate,
  formatTimestamp
} from '../_lib/types'

export type { StatusUpdate }

interface ChatContextType {
  // State
  chats: Chat[]
  selectedChat: Chat | null
  messages: Message[]
  currentUser: ChatUser | null

  // Loading
  isLoading: boolean
  isMessagesLoading: boolean

  // Actions
  selectChat: (chat: Chat | null) => void
  sendMessage: (text: string, replyTo?: { id: string; text: string; senderName: string }, media?: { type: 'image' | 'document'; url: string; name?: string; size?: number; mimeType?: string }) => Promise<boolean>
  sendMediaMessage: (file: File, caption?: string) => Promise<boolean>
  sendVoiceMessage: (file: File, duration: number) => Promise<boolean>
  startDirectChat: (user: ChatUser) => Promise<string | null>
  createGroupChat: (name: string, members: ChatUser[]) => Promise<string | null>
  searchUsers: (term: string) => Promise<ChatUser[]>
  deleteChat: (chatId: string) => Promise<boolean>
  deleteMessage: (messageId: string, forEveryone?: boolean) => Promise<boolean>
  toggleReaction: (messageId: string, reaction: ReactionType) => Promise<boolean>
  // Group management
  addGroupMembers: (members: ChatUser[]) => Promise<boolean>
  removeGroupMember: (memberId: string) => Promise<boolean>
  leaveGroup: () => Promise<boolean>
  deleteGroup: () => Promise<boolean>
  renameGroup: (newName: string) => Promise<boolean>
  updateGroupDescription: (description: string) => Promise<boolean>
  updateChatAvatar: (avatarUrl: string) => Promise<boolean>
  toggleGroupAdmin: (targetUserId: string, status: boolean) => Promise<boolean>
  togglePinChat: (pinned: boolean) => Promise<boolean>
  clearChat: () => Promise<boolean>
  editMessage: (messageId: string, newText: string) => Promise<boolean>
  forwardMessage: (targetChatId: string, originalMessage: Message) => Promise<boolean>
  pinMessage: (messageId: string | null) => Promise<boolean>
  setTypingStatus: (status: 'typing' | 'recording_voice' | null) => Promise<void>
  isGroupCreator: () => boolean
  isGroupAdmin: (userId?: string) => boolean
  getChatDisplayName: (chat: Chat) => string
  getChatAvatar: (chat: Chat) => string | undefined
  typingUsers: { userName: string, status: string }[]
  allTypingUsers: { [chatId: string]: { userName: string, status: string }[] }
  userPresence: { [userId: string]: { status: 'online' | 'offline'; lastSeen: any } }
  
  // Statuses
  statuses: StatusUpdate[]
  uploadStatus: (file: File, caption?: string, trimOptions?: { startTime: number; endTime: number }) => Promise<boolean>
  viewStatus: (statusId: string) => Promise<void>
  deleteStatus: (statusId: string) => Promise<boolean>
  toggleStatusLike: (statusId: string) => Promise<boolean>
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

function normalizeChat(c: any): Chat {
  return {
    id: c.id,
    type: c.type || (c.isGroup || (c.name && !c.participants?.length) ? 'group' : 'direct'),
    name: c.name || c.title || undefined,
    title: c.title || c.name || undefined,
    description: c.description || undefined,
    avatar: typeof c.avatar === 'string' ? c.avatar : c.avatar?.uri || undefined,
    participants: Array.isArray(c.participants)
      ? c.participants.map((p: any) => typeof p === 'string' ? p : (p.userId || p.id))
      : [],
    participantNames: c.participantNames || {},
    participantDetails: c.participantDetails || {},
    admins: Array.isArray(c.admins) ? c.admins : [],
    createdBy: c.createdBy || c.createdById || '',
    createdAt: formatTimestamp(c.createdAt || c.created_at),
    lastMessage: c.lastMessage ? {
      text: c.lastMessage.text || '',
      senderId: c.lastMessage.senderId || '',
      senderName: c.lastMessage.senderName || '',
      timestamp: formatTimestamp(c.lastMessage.timestamp || c.lastMessage.createdAt)
    } : undefined,
    unreadCount: c.unreadCount || {},
    isActive: c.isActive !== false,
    pinned: c.pinned || false,
    pinnedMessageId: c.pinnedMessageId || null,
    clearedAt: c.clearedAt || {},
    starred: c.starred || {}
  }
}

function normalizeMessage(m: any): Message {
  const isImage = m.type === 'image' || Boolean(m.imageUrl)
  const isDoc = m.type === 'document' || Boolean(m.documentUrl)
  const isVoice = m.type === 'voice' || m.type === 'audio' || Boolean(m.audioUrl)

  let attachment: MessageAttachment | undefined
  if (m.attachment) {
    attachment = m.attachment
  } else if (m.mediaUrl || m.documentUrl || m.audioUrl || m.imageUrl) {
    attachment = {
      url: m.mediaUrl || m.documentUrl || m.audioUrl || m.imageUrl,
      name: m.documentName || m.fileName || 'Attachment',
      size: m.documentSize || m.fileSize,
      mimeType: m.mimeType
    }
  }

  return {
    id: m.id,
    chatId: m.chatId,
    senderId: m.senderId,
    senderName: m.senderName || m.sender || 'Member',
    senderAvatar: m.senderAvatar || undefined,
    text: m.text || '',
    timestamp: formatTimestamp(m.createdAt || m.timestamp),
    type: isVoice ? 'voice' : isImage ? 'image' : isDoc ? 'document' : (m.type || 'text'),
    imageUrl: m.imageUrl || (isImage ? m.mediaUrl : undefined),
    attachment,
    reactions: m.reactions || {},
    replyTo: m.replyTo ? {
      id: m.replyTo.id || m.replyTo.messageId,
      text: m.replyTo.text || m.replyTo.snippet || '',
      senderName: m.replyTo.senderName || 'Member'
    } : undefined,
    isPinned: Boolean(m.isPinned || m.pinned),
    isEdited: Boolean(m.isEdited || m.edited),
    status: m.status || 'sent'
  }
}

export function ChatProviderV2({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth()
  const { currentZone } = useZone()

  const [chats, setChats] = useState<Chat[]>([])
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [typingUsers, setTypingUsers] = useState<{ userName: string, status: string }[]>([])
  const [allTypingUsers, setAllTypingUsers] = useState<{ [chatId: string]: { userName: string, status: string }[] }>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isMessagesLoading, setIsMessagesLoading] = useState(false)
  const [userPresence, setUserPresence] = useState<{ [userId: string]: { status: 'online' | 'offline'; lastSeen: any } }>({})
  const [statuses, setStatuses] = useState<StatusUpdate[]>([])

  const selectedChatRef = useRef<Chat | null>(null)
  selectedChatRef.current = selectedChat

  // Build current user object
  const currentUser: ChatUser | null = (user?.uid && profile) ? {
    id: user.uid,
    name: String(`${profile.first_name || ''} ${profile.last_name || ''}`.trim() || user.displayName || user.email?.split('@')[0] || 'User'),
    email: profile.email || user.email || '',
    fullName: `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
    avatar: (profile.profile_image_url || user.photoURL) ? String(profile.profile_image_url || user.photoURL) : undefined,
    profilePic: (profile.profile_image_url || user.photoURL) ? String(profile.profile_image_url || user.photoURL) : undefined,
    zoneId: currentZone?.id,
    zoneName: currentZone?.name
  } : null

  // Load Chats
  const loadChats = useCallback(async () => {
    if (!user?.uid) {
      setChats([])
      setIsLoading(false)
      return
    }
    try {
      const res: any = await BackendAPI.chats.getAll()
      const list = Array.isArray(res) ? res : (res?.data || [])
      const mapped = list.map(normalizeChat)
      setChats(mapped)
    } catch (err) {
      console.error('[ChatContext] Error loading chats:', err)
    } finally {
      setIsLoading(false)
    }
  }, [user?.uid])

  useEffect(() => {
    loadChats()
  }, [loadChats])

  // Real-time Chat subscription
  useEffect(() => {
    if (!user?.uid) return
    const unsub = BackendAPI.realtime.subscribe('chat', user.uid || 'all', () => {
      loadChats()
    })
    return () => unsub()
  }, [user?.uid, loadChats])

  // Keep selectedChat in sync with chats array
  useEffect(() => {
    if (selectedChat) {
      const updatedChat = chats.find(c => c.id === selectedChat.id)
      if (updatedChat) {
        if (JSON.stringify(updatedChat) !== JSON.stringify(selectedChat)) {
          setSelectedChat(updatedChat)
        }
      } else {
        setSelectedChat(null)
      }
    }
  }, [chats, selectedChat])

  // Load Messages for selected chat
  const loadMessages = useCallback(async (chatId: string) => {
    setIsMessagesLoading(true)
    try {
      const res: any = await BackendAPI.chats.messages(chatId, { limit: 100 })
      const list = Array.isArray(res) ? res : (res?.data || [])
      const mapped = list.map(normalizeMessage)
      setMessages(mapped)
    } catch (err) {
      console.error('[ChatContext] Error loading messages:', err)
    } finally {
      setIsMessagesLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!selectedChat?.id) {
      setMessages([])
      return
    }

    loadMessages(selectedChat.id)

    // Mark as read
    BackendAPI.chats.markRead(selectedChat.id).catch(() => {})

    // Real-time subscription to messages in this chat
    const unsub = BackendAPI.realtime.subscribe('messages', selectedChat.id, (payload: any) => {
      if (payload && payload.id) {
        const newMsg = normalizeMessage(payload)
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) {
            return prev.map(m => m.id === newMsg.id ? newMsg : m)
          }
          return [...prev, newMsg]
        })
      } else {
        loadMessages(selectedChat.id)
      }
    })

    return () => {
      unsub()
    }
  }, [selectedChat?.id, loadMessages])

  // Load Statuses
  const loadStatuses = useCallback(async () => {
    if (!user?.uid) return
    try {
      const res: any = await BackendAPI.statuses.getAll()
      const list = Array.isArray(res) ? res : (res?.data || [])
      const now = Date.now()
      const dayAgo = now - 24 * 60 * 60 * 1000
      const active = list.filter((s: any) => {
        const ts = new Date(s.createdAt || s.timestamp || now).getTime()
        return ts > dayAgo
      }).map((s: any) => ({
        id: s.id,
        userId: s.userId || s.user_id,
        userName: s.userName || s.user_name || 'Member',
        userAvatar: s.userAvatar || s.user_avatar,
        mediaUrl: s.mediaUrl || s.media_url,
        type: s.type || 'image',
        timestamp: formatTimestamp(s.createdAt || s.timestamp),
        caption: s.caption,
        viewers: Array.isArray(s.viewers) ? s.viewers : [],
        likes: Array.isArray(s.likes) ? s.likes : [],
        zoneId: s.zoneId || s.zone_id
      }))
      setStatuses(active)
    } catch (err) {
      console.error('[ChatContext] Error loading statuses:', err)
    }
  }, [user?.uid])

  useEffect(() => {
    loadStatuses()
    if (!user?.uid) return
    const unsub = BackendAPI.realtime.subscribe('statuses', 'all', () => {
      loadStatuses()
    })
    return () => unsub()
  }, [user?.uid, loadStatuses])

  // Presence
  useEffect(() => {
    if (!user?.uid) return

    BackendAPI.chats.setPresence({ status: 'online' }).catch(() => {})

    const handleFocus = () => BackendAPI.chats.setPresence({ status: 'online' }).catch(() => {})
    const handleBlur = () => BackendAPI.chats.setPresence({ status: 'offline' }).catch(() => {})

    window.addEventListener('focus', handleFocus)
    window.addEventListener('blur', handleBlur)

    const unsub = BackendAPI.realtime.subscribe('presence', 'all', (data: any) => {
      if (data?.userId) {
        setUserPresence(prev => ({
          ...prev,
          [data.userId]: {
            status: data.status || 'offline',
            lastSeen: data.lastSeen ? formatTimestamp(data.lastSeen) : new Date()
          }
        }))
      }
    })

    return () => {
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('blur', handleBlur)
      unsub()
      BackendAPI.chats.setPresence({ status: 'offline' }).catch(() => {})
    }
  }, [user?.uid])

  // Actions
  const selectChat = useCallback((chat: Chat | null) => {
    setSelectedChat(chat)
    if (!chat) {
      setMessages([])
    }
  }, [])

  const sendMessage = useCallback(async (
    text: string,
    replyTo?: { id: string; text: string; senderName: string },
    media?: { type: 'image' | 'document'; url: string; name?: string; size?: number; mimeType?: string }
  ) => {
    if (!selectedChatRef.current || !currentUser) return false
    try {
      const payload: any = {
        text: text.trim(),
        replyTo: replyTo ? {
          id: replyTo.id,
          text: replyTo.text,
          senderName: replyTo.senderName
        } : undefined
      }

      if (media) {
        payload.type = media.type
        payload.mediaUrl = media.url
        payload.documentName = media.name
        payload.documentSize = media.size
        payload.mimeType = media.mimeType
      }

      await BackendAPI.chats.sendMessage(selectedChatRef.current.id, payload)
      if (selectedChatRef.current) {
        loadMessages(selectedChatRef.current.id)
      }
      return true
    } catch (err) {
      console.error('[ChatContext] Send message error:', err)
      return false
    }
  }, [currentUser, loadMessages])

  const sendMediaMessage = useCallback(async (file: File, caption?: string) => {
    if (!selectedChatRef.current || !currentUser) return false

    try {
      const isImage = file.type.startsWith('image/')
      const mediaType = isImage ? 'image' : 'document'

      // Upload via BackendAPI
      const uploadRes: any = await BackendAPI.upload.file(file, 'chats')
      const finalUrl = uploadRes?.url || uploadRes?.secure_url

      if (!finalUrl) throw new Error('File upload failed')

      return sendMessage(caption || '', undefined, {
        type: mediaType,
        url: finalUrl,
        name: file.name,
        size: file.size,
        mimeType: file.type
      })
    } catch (error) {
      console.error('[ChatContext] sendMediaMessage error:', error)
      return false
    }
  }, [currentUser, sendMessage])

  const sendVoiceMessage = useCallback(async (file: File, duration: number) => {
    if (!selectedChatRef.current || !currentUser) return false

    try {
      const uploadRes: any = await BackendAPI.upload.file(file, 'audio')
      const finalUrl = uploadRes?.url || uploadRes?.secure_url

      if (!finalUrl) throw new Error('Voice upload failed')

      await BackendAPI.chats.sendMessage(selectedChatRef.current.id, {
        text: '',
        type: 'voice',
        mediaUrl: finalUrl,
        duration
      })
      if (selectedChatRef.current) {
        loadMessages(selectedChatRef.current.id)
      }
      return true
    } catch (error) {
      console.error('[ChatContext] sendVoiceMessage error:', error)
      return false
    }
  }, [currentUser, loadMessages])

  const startDirectChat = useCallback(async (otherUser: ChatUser) => {
    if (!currentUser) return null
    try {
      const res: any = await BackendAPI.chats.create({
        type: 'direct',
        participantIds: [otherUser.id]
      })
      const chat = normalizeChat(res.data || res)
      loadChats()
      return chat.id
    } catch (err) {
      console.error('[ChatContext] startDirectChat error:', err)
      return null
    }
  }, [currentUser, loadChats])

  const createGroupChat = useCallback(async (name: string, members: ChatUser[]) => {
    if (!currentUser) return null
    try {
      const participantIds = [currentUser.id, ...members.map(m => m.id)]
      const res: any = await BackendAPI.chats.create({
        type: 'group',
        name,
        participantIds
      })
      const chat = normalizeChat(res.data || res)
      loadChats()
      return chat.id
    } catch (err) {
      console.error('[ChatContext] createGroupChat error:', err)
      return null
    }
  }, [currentUser, loadChats])

  const searchUsers = useCallback(async (term: string) => {
    if (!user?.uid) return []
    try {
      const res: any = await BackendAPI.members.getAll({ q: term, zone_id: currentZone?.id })
      const list: any[] = Array.isArray(res) ? res : (res?.data || [])
      return list
        .filter(m => (m.user_id || m.id) !== user.uid)
        .map(m => ({
          id: m.user_id || m.id,
          name: m.full_name || `${m.first_name || ''} ${m.last_name || ''}`.trim() || m.email || 'Member',
          email: m.email || '',
          avatar: m.profile_image_url || m.avatar_url,
          zoneId: m.zone_id,
          zoneName: m.zone_name
        }))
    } catch (err) {
      console.error('[ChatContext] searchUsers error:', err)
      return []
    }
  }, [user?.uid, currentZone?.id])

  const deleteChat = useCallback(async (chatId: string) => {
    try {
      await BackendAPI.chats.delete(chatId)
      if (selectedChatRef.current?.id === chatId) {
        setSelectedChat(null)
      }
      loadChats()
      return true
    } catch (err) {
      console.error('[ChatContext] deleteChat error:', err)
      return false
    }
  }, [loadChats])

  const deleteMessage = useCallback(async (messageId: string, _forEveryone: boolean = false) => {
    if (!selectedChatRef.current) return false
    try {
      await BackendAPI.chats.deleteMessage(selectedChatRef.current.id, messageId)
      setMessages(prev => prev.filter(m => m.id !== messageId))
      return true
    } catch (err) {
      console.error('[ChatContext] deleteMessage error:', err)
      return false
    }
  }, [])

  const toggleReaction = useCallback(async (messageId: string, reaction: ReactionType) => {
    if (!selectedChatRef.current) return false
    try {
      await BackendAPI.chats.react(selectedChatRef.current.id, messageId, { emoji: reaction })
      if (selectedChatRef.current) {
        loadMessages(selectedChatRef.current.id)
      }
      return true
    } catch (err) {
      console.error('[ChatContext] toggleReaction error:', err)
      return false
    }
  }, [loadMessages])

  const addGroupMembers = useCallback(async (members: ChatUser[]) => {
    if (!selectedChatRef.current) return false
    try {
      await BackendAPI.chats.addParticipants(selectedChatRef.current.id, {
        userIds: members.map(m => m.id)
      })
      loadChats()
      return true
    } catch (err) {
      console.error('[ChatContext] addGroupMembers error:', err)
      return false
    }
  }, [loadChats])

  const removeGroupMember = useCallback(async (memberId: string) => {
    if (!selectedChatRef.current) return false
    try {
      await BackendAPI.chats.removeParticipant(selectedChatRef.current.id, memberId)
      loadChats()
      return true
    } catch (err) {
      console.error('[ChatContext] removeGroupMember error:', err)
      return false
    }
  }, [loadChats])

  const leaveGroup = useCallback(async () => {
    if (!selectedChatRef.current) return false
    try {
      await BackendAPI.chats.leave(selectedChatRef.current.id)
      setSelectedChat(null)
      loadChats()
      return true
    } catch (err) {
      console.error('[ChatContext] leaveGroup error:', err)
      return false
    }
  }, [loadChats])

  const deleteGroup = useCallback(async () => {
    if (!selectedChatRef.current) return false
    try {
      await BackendAPI.chats.delete(selectedChatRef.current.id)
      setSelectedChat(null)
      loadChats()
      return true
    } catch (err) {
      console.error('[ChatContext] deleteGroup error:', err)
      return false
    }
  }, [loadChats])

  const renameGroup = useCallback(async (newName: string) => {
    if (!selectedChatRef.current) return false
    try {
      await BackendAPI.chats.update(selectedChatRef.current.id, { name: newName })
      loadChats()
      return true
    } catch (err) {
      console.error('[ChatContext] renameGroup error:', err)
      return false
    }
  }, [loadChats])

  const updateGroupDescription = useCallback(async (description: string) => {
    if (!selectedChatRef.current) return false
    try {
      await BackendAPI.chats.update(selectedChatRef.current.id, { description })
      loadChats()
      return true
    } catch (err) {
      console.error('[ChatContext] updateGroupDescription error:', err)
      return false
    }
  }, [loadChats])

  const updateChatAvatar = useCallback(async (avatarUrl: string) => {
    if (!selectedChatRef.current) return false
    try {
      await BackendAPI.chats.update(selectedChatRef.current.id, { avatar: avatarUrl })
      loadChats()
      return true
    } catch (err) {
      console.error('[ChatContext] updateChatAvatar error:', err)
      return false
    }
  }, [loadChats])

  const toggleGroupAdmin = useCallback(async (targetUserId: string, status: boolean) => {
    if (!selectedChatRef.current) return false
    try {
      await BackendAPI.chats.setParticipantRole(selectedChatRef.current.id, targetUserId, {
        role: status ? 'admin' : 'member'
      })
      loadChats()
      return true
    } catch (err) {
      console.error('[ChatContext] toggleGroupAdmin error:', err)
      return false
    }
  }, [loadChats])

  const togglePinChat = useCallback(async (pinned: boolean) => {
    if (!selectedChatRef.current) return false
    try {
      await BackendAPI.chats.settings(selectedChatRef.current.id, { pinned })
      loadChats()
      return true
    } catch (err) {
      console.error('[ChatContext] togglePinChat error:', err)
      return false
    }
  }, [loadChats])

  const clearChat = useCallback(async () => {
    if (!selectedChatRef.current) return false
    try {
      await BackendAPI.chats.clearMessages(selectedChatRef.current.id)
      setMessages([])
      return true
    } catch (err) {
      console.error('[ChatContext] clearChat error:', err)
      return false
    }
  }, [])

  const editMessage = useCallback(async (messageId: string, newText: string) => {
    if (!selectedChatRef.current) return false
    try {
      await BackendAPI.chats.editMessage(selectedChatRef.current.id, messageId, { text: newText })
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, text: newText, isEdited: true } : m))
      return true
    } catch (err) {
      console.error('[ChatContext] editMessage error:', err)
      return false
    }
  }, [])

  const forwardMessage = useCallback(async (targetChatId: string, originalMessage: Message) => {
    try {
      await BackendAPI.chats.sendMessage(targetChatId, {
        text: originalMessage.text,
        type: originalMessage.type,
        mediaUrl: originalMessage.imageUrl || originalMessage.attachment?.url,
        documentName: originalMessage.attachment?.name,
        documentSize: originalMessage.attachment?.size
      })
      return true
    } catch (err) {
      console.error('[ChatContext] forwardMessage error:', err)
      return false
    }
  }, [])

  const pinMessage = useCallback(async (messageId: string | null) => {
    if (!selectedChatRef.current) return false
    try {
      await BackendAPI.chats.settings(selectedChatRef.current.id, { pinnedMessageId: messageId })
      loadChats()
      return true
    } catch (err) {
      console.error('[ChatContext] pinMessage error:', err)
      return false
    }
  }, [loadChats])

  const setTypingStatus = useCallback(async (status: 'typing' | 'recording_voice' | null) => {
    if (!selectedChatRef.current) return
    try {
      await BackendAPI.chats.typing(selectedChatRef.current.id, { status })
    } catch {}
  }, [])

  const isGroupCreator = useCallback(() => {
    if (!user?.uid || !selectedChat || selectedChat.type !== 'group') return false
    return selectedChat.createdBy === user.uid
  }, [user?.uid, selectedChat])

  const isGroupAdmin = useCallback((userId?: string) => {
    const idToCheck = userId || user?.uid
    if (!idToCheck || !selectedChat || selectedChat.type !== 'group') return false
    return selectedChat.createdBy === idToCheck || (selectedChat.admins || []).includes(idToCheck)
  }, [user?.uid, selectedChat])

  const getChatDisplayName = useCallback((chat: Chat) => {
    if (chat.type === 'group') {
      return chat.name || chat.title || 'Group'
    }
    const otherId = chat.participants.find(id => id !== user?.uid)
    if (otherId && chat.participantDetails?.[otherId]?.name) {
      return chat.participantDetails[otherId].name
    }
    return chat.name || chat.title || 'Chat'
  }, [user?.uid])

  const getChatAvatar = useCallback((chat: Chat) => {
    if (chat.type === 'group') {
      return chat.avatar
    }
    const otherId = chat.participants.find(id => id !== user?.uid)
    if (otherId && chat.participantDetails?.[otherId]?.avatar) {
      return chat.participantDetails[otherId].avatar
    }
    return chat.avatar
  }, [user?.uid])

  const uploadStatus = useCallback(async (file: File, caption?: string) => {
    if (!currentUser) return false
    try {
      const isImage = file.type.startsWith('image/')
      const isVideo = file.type.startsWith('video/')
      const isAudio = file.type.startsWith('audio/')
      const type = isImage ? 'image' : isVideo ? 'video' : 'audio'

      const uploadRes: any = await BackendAPI.upload.file(file, 'status')
      const finalUrl = uploadRes?.url || uploadRes?.secure_url

      if (!finalUrl) throw new Error('Status upload failed')

      await BackendAPI.statuses.create({
        userId: currentUser.id,
        userName: currentUser.name,
        userAvatar: currentUser.avatar,
        mediaUrl: finalUrl,
        type,
        caption,
        zoneId: currentZone?.id
      })
      loadStatuses()
      return true
    } catch (e) {
      console.error('[ChatContext] uploadStatus error:', e)
      return false
    }
  }, [currentUser, currentZone?.id, loadStatuses])

  const viewStatus = useCallback(async (statusId: string) => {
    try {
      await BackendAPI.statuses.view(statusId)
    } catch {}
  }, [])

  const deleteStatus = useCallback(async (statusId: string) => {
    try {
      await BackendAPI.statuses.delete(statusId)
      loadStatuses()
      return true
    } catch (e) {
      console.error('[ChatContext] deleteStatus error:', e)
      return false
    }
  }, [loadStatuses])

  const toggleStatusLike = useCallback(async (statusId: string) => {
    try {
      await BackendAPI.statuses.like(statusId)
      loadStatuses()
      return true
    } catch (e) {
      console.error('[ChatContext] toggleStatusLike error:', e)
      return false
    }
  }, [loadStatuses])

  return (
    <ChatContext.Provider value={{
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
      addGroupMembers,
      removeGroupMember,
      leaveGroup,
      deleteGroup,
      renameGroup,
      updateGroupDescription,
      updateChatAvatar,
      toggleGroupAdmin,
      togglePinChat,
      clearChat,
      editMessage,
      forwardMessage,
      pinMessage,
      setTypingStatus,
      isGroupCreator,
      isGroupAdmin,
      getChatDisplayName,
      getChatAvatar,
      typingUsers,
      allTypingUsers,
      userPresence,
      statuses,
      uploadStatus,
      viewStatus,
      deleteStatus,
      toggleStatusLike
    }}>
      {children}
    </ChatContext.Provider>
  )
}

export function useChatV2() {
  const context = useContext(ChatContext)
  if (context === undefined) {
    throw new Error('useChatV2 must be used within a ChatProviderV2')
  }
  return context
}
