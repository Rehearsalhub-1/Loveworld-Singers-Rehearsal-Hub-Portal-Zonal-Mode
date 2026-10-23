/**
 * PURE TYPES FOR GROUPS & CHAT
 * Zero external database dependencies.
 */

export interface ChatUser {
  id: string
  email?: string
  fullName?: string
  name: string
  firstName?: string
  lastName?: string
  profilePic?: string
  avatar?: string
  isOnline?: boolean
  lastSeen?: any
  zoneId?: string
  zoneName?: string
}

export type ReactionType = '❤️' | '👍' | '😂' | '😮' | '😢' | '🙏' | '🔥' | '👏' | '💯' | '✨' | ''

export type MessageType = 'text' | 'image' | 'document' | 'voice' | 'system'

export interface MessageAttachment {
  url: string
  name: string
  size?: number
  mimeType?: string
}

export interface MessageReaction {
  userId: string
  userName: string
  emoji: string
  timestamp: Date
}

export interface ChatMessage {
  id: string
  chatId: string
  senderId: string
  senderName: string
  senderAvatar?: string
  text?: string
  image?: string
  fileUrl?: string
  fileName?: string
  messageType: 'text' | 'image' | 'file' | 'system'
  timestamp: Date
  edited: boolean
  editedAt?: Date
  reactions: MessageReaction[]
  replyTo?: string
  replySnippet?: string
  replySenderName?: string
  deleted?: boolean
}

export interface Message {
  id: string
  chatId: string
  senderId: string
  senderName: string
  senderAvatar?: string
  text: string
  timestamp: Date | any
  type: MessageType
  imageUrl?: string
  attachment?: MessageAttachment
  voiceUrl?: string
  voiceDuration?: number
  reactions?: Record<string, string[]>
  replyTo?: {
    id: string
    text: string
    senderName: string
  }
  isPinned?: boolean
  pinnedInChat?: boolean
  isEdited?: boolean
  edited?: boolean
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'forwarded'
}

export interface Chat {
  id: string
  type: 'direct' | 'group'
  name?: string
  title?: string
  description?: string
  avatar?: string
  participants: string[]
  participantNames?: { [userId: string]: string }
  participantDetails?: { [userId: string]: any }
  admins: string[]
  createdBy: string
  createdAt: Date | any
  lastMessage?: {
    text: string
    senderId: string
    senderName: string
    timestamp: Date | any
    status?: string
  }
  unreadCount: { [userId: string]: number } | any
  isActive?: boolean
  pinned?: { [userId: string]: boolean } | boolean
  pinnedMessageId?: string | null
  clearedAt?: Record<string, any>
  starred?: { [userId: string]: boolean }
}

export interface FriendRequest {
  id: string
  senderId: string
  senderName: string
  senderAvatar?: string
  receiverId: string
  status: 'pending' | 'accepted' | 'rejected'
  createdAt: Date
}

export interface StatusUpdate {
  id: string
  userId: string
  userName: string
  userAvatar?: string
  mediaUrl: string
  type: 'image' | 'video' | 'audio'
  timestamp: any
  caption?: string
  viewers: string[]
  likes?: string[]
  zoneId?: string
}

export const formatTimestamp = (timestamp: any): Date => {
  if (!timestamp) return new Date()
  if (timestamp instanceof Date) return timestamp
  if (typeof timestamp.toDate === 'function') return timestamp.toDate()
  if (typeof timestamp.toMillis === 'function') return new Date(timestamp.toMillis())
  if (typeof timestamp === 'string' || typeof timestamp === 'number') return new Date(timestamp)
  if (timestamp.seconds) return new Date(timestamp.seconds * 1000)
  return new Date()
}
