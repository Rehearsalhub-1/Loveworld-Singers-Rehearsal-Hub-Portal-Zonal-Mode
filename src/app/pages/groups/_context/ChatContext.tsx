'use client'

import React from 'react'
import { ChatProviderV2, useChatV2 } from './ChatContextV2'
import type { Chat, Message, ChatUser, FriendRequest, MessageReaction } from '../_lib/types'

export type { Chat, Message as ChatMessage, ChatUser, FriendRequest, MessageReaction }

export function ChatProvider({ children }: { children: React.ReactNode }) {
  return <ChatProviderV2>{children}</ChatProviderV2>
}

export function useChat() {
  const v2 = useChatV2()
  return {
    ...v2,
    onlineUsers: [] as ChatUser[],
    friendRequests: [] as FriendRequest[],
    replyToMessage: null,
    editingMessage: null,
    isChatsLoading: v2.isLoading,
    isUsersLoading: false,
    setSelectedChat: v2.selectChat,
    setReplyToMessage: () => {},
    setEditingMessage: () => {},
    sendFriendRequest: async () => false,
    acceptFriendRequest: async () => false,
    getFriendStatus: async () => ({ status: 'none' as const }),
    addUserToGroup: async (chatId: string, userId: string) => {
      return v2.addGroupMembers([{ id: userId, name: 'User' }])
    },
    removeUserFromGroup: async (_chatId: string, userId: string) => {
      return v2.removeGroupMember(userId)
    },
    makeUserAdmin: async (_chatId: string, userId: string) => {
      return v2.toggleGroupAdmin(userId, true)
    },
    updateGroupInfo: async (_chatId: string, updates: { name?: string; description?: string; avatar?: string }) => {
      if (updates.name) await v2.renameGroup(updates.name)
      if (updates.description) await v2.updateGroupDescription(updates.description)
      if (updates.avatar) await v2.updateChatAvatar(updates.avatar)
      return true
    },
    togglePinChat: async (_chatId: string, pin: boolean) => {
      return v2.togglePinChat(pin)
    },
    toggleStarChat: async () => false,
    searchMessages: async () => [],
    toggleStarMessage: async () => false,
    isMessageStarred: async () => false
  }
}
