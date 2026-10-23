'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { BackendAPI } from '@/lib/api-client';
import {
    MessageCircle,
    Send,
    User,
    Clock,
    Search,
    MoreVertical,
    CheckCheck,
    ShieldCheck,
    Mail,
    UserCheck,
    ChevronLeft
} from 'lucide-react';

interface Message {
    id: string;
    chatId: string;
    text: string;
    senderId: string;
    senderName: string;
    senderType: 'user' | 'admin';
    timestamp: any;
}

interface ChatThread {
    chatId: string;
    userName: string;
    lastMessage: string;
    lastTimestamp: any;
    unreadCount: number;
}

export default function SupportChatSection() {
    const { user, profile } = useAuth();
    const [threads, setThreads] = useState<ChatThread[]>([]);
    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Fetch all chat threads
    useEffect(() => {
        let active = true;
        const fetchThreads = async () => {
            try {
                const res: any = await BackendAPI.generic.list('support_messages', 200).catch(() => ({ data: [] }));
                if (!active) return;
                const list = Array.isArray(res) ? res : (res?.data || []);
                const threadMap = new Map<string, ChatThread>();

                list.forEach((data: any) => {
                    const chatId = data.chatId;
                    if (!chatId) return;

                    if (!threadMap.has(chatId)) {
                        threadMap.set(chatId, {
                            chatId,
                            userName: data.senderName || 'Unknown User',
                            lastMessage: data.text || '',
                            lastTimestamp: data.timestamp || data.createdAt || new Date().toISOString(),
                            unreadCount: 0
                        });
                    }
                });

                setThreads(Array.from(threadMap.values()));
                setLoading(false);
            } catch (e) {
                setLoading(false);
            }
        };

        fetchThreads();
        const unsub = BackendAPI.realtime.subscribe('chat', 'all', () => {
            fetchThreads();
        });
        const interval = setInterval(fetchThreads, 60000);

        return () => {
            active = false;
            unsub();
            clearInterval(interval);
        };
    }, []);

    // Fetch messages for selected chat
    useEffect(() => {
        if (!selectedChatId) {
            setMessages([]);
            return;
        }

        let active = true;
        const fetchMessages = async () => {
            try {
                const res: any = await BackendAPI.generic.list('support_messages', 100, 'chatId', selectedChatId).catch(() => ({ data: [] }));
                if (!active) return;
                const list = Array.isArray(res) ? res : (res?.data || []);
                const msgs: Message[] = list.map((data: any) => ({
                    id: data.id || `msg-${Math.random()}`,
                    chatId: data.chatId,
                    text: data.text || '',
                    senderId: data.senderId,
                    senderName: data.senderName,
                    senderType: data.senderType,
                    timestamp: data.timestamp || data.createdAt || new Date().toISOString()
                }));
                setMessages(msgs);
                setTimeout(scrollToBottom, 100);
            } catch (e) {}
        };

        fetchMessages();
        const unsub = BackendAPI.realtime.subscribe('messages', selectedChatId, () => {
            fetchMessages();
        });
        const interval = setInterval(fetchMessages, 60000);

        return () => {
            active = false;
            unsub();
            clearInterval(interval);
        };
    }, [selectedChatId]);

    const handleSendReply = async () => {
        if (!newMessage.trim() || !selectedChatId || !user) return;

        const textToSubmit = newMessage;
        setNewMessage('');

        const adminName = profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}` : 'Admin Support';

        try {
            await BackendAPI.generic.create('support_messages', {
                chatId: selectedChatId,
                text: textToSubmit,
                senderId: user.uid || '',
                senderName: adminName,
                senderType: 'admin',
                timestamp: new Date().toISOString(),
                status: 'sent'
            });
            setMessages(prev => [...prev, {
                id: `reply-${Date.now()}`,
                chatId: selectedChatId,
                text: textToSubmit,
                senderId: user.uid || '',
                senderName: adminName,
                senderType: 'admin',
                timestamp: new Date().toISOString()
            }]);
            setTimeout(scrollToBottom, 100);
        } catch (error) {
            console.error('Error sending reply:', error);
        }
    };

    const filteredThreads = threads.filter(t =>
        t.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const selectedThread = threads.find(t => t.chatId === selectedChatId);

    return (
        <div className="flex h-[calc(100vh-140px)] md:h-full bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm relative">
            {/* 3-Pane Layout: Pane 1 (Threads) */}
            <div className={`${selectedChatId ? 'hidden md:flex' : 'flex'} w-full md:w-80 border-r border-slate-100 flex-col bg-slate-50/30 transition-all duration-300`}>
                <div className="p-4 md:p-6">
                    <div className="flex items-center justify-between mb-4 md:mb-6">
                        <h1 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight">Messages</h1>
                        <div className="flex items-center gap-1 bg-indigo-50 px-2 py-0.5 md:py-1 rounded-full">
                            <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-pulse"></span>
                            <span className="text-[10px] font-bold text-indigo-700 uppercase">{threads.length}</span>
                        </div>
                    </div>

                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search conversations..."
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[11px] md:text-xs focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 transition-all font-medium"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar px-2 md:px-3 space-y-1 pb-4">
                    {loading ? (
                        <div className="p-10 text-center">
                            <div className="w-6 h-6 border-2 border-slate-200 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3"></div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Hydrating Inbox...</p>
                        </div>
                    ) : filteredThreads.length === 0 ? (
                        <div className="p-10 text-center space-y-3 opacity-40">
                            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto">
                                <Mail className="w-6 h-6 text-slate-400" />
                            </div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase">Your inbox is empty</p>
                        </div>
                    ) : (
                        filteredThreads.map((thread) => (
                            <button
                                key={thread.chatId}
                                onClick={() => setSelectedChatId(thread.chatId)}
                                className={`w-full p-3 flex items-start gap-3 rounded-xl transition-all group relative ${selectedChatId === thread.chatId
                                    ? 'bg-white shadow-sm ring-1 ring-slate-200'
                                    : 'hover:bg-white/60'
                                    }`}
                            >
                                <div className="relative flex-shrink-0">
                                    <div className="w-10 h-10 md:w-11 md:h-11 bg-slate-100 rounded-xl flex items-center justify-center overflow-hidden border border-slate-200">
                                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${thread.chatId}`} alt="U" className="w-full h-full object-cover" />
                                    </div>
                                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 md:w-3.5 md:h-3.5 bg-green-500 border-2 border-white rounded-full"></span>
                                </div>

                                <div className="flex-1 min-w-0 py-0.5 text-left">
                                    <div className="flex justify-between items-baseline mb-0.5">
                                        <h3 className="font-bold text-slate-900 text-sm truncate">{thread.userName}</h3>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter ml-1">
                                            {thread.lastTimestamp?.toDate?.() ?
                                                new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: 'numeric' }).format(thread.lastTimestamp.toDate()) :
                                                'Now'}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 truncate font-medium">{thread.lastMessage}</p>
                                </div>

                                {selectedChatId === thread.chatId && (
                                    <div className="absolute left-0 top-3 bottom-3 w-1 bg-indigo-600 rounded-full"></div>
                                )}
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Pane 2: Primary Chat Window */}
            <div className={`${selectedChatId ? 'flex' : 'hidden md:flex'} flex-1 flex flex-col min-w-0 bg-white relative h-full transition-all duration-300`}>
                {selectedChatId ? (
                    <>
                        {/* SaaS Header */}
                        <div className="h-16 md:h-20 px-4 md:px-6 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
                            <div className="flex items-center gap-2 md:gap-4">
                                <button
                                    onClick={() => setSelectedChatId(null)}
                                    className="p-2 -ml-2 hover:bg-slate-50 rounded-xl md:hidden text-slate-600"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <div className="w-8 h-8 md:w-10 md:h-10 bg-indigo-50 rounded-lg md:rounded-xl flex items-center justify-center border border-indigo-100">
                                    <UserCheck className="w-4 h-4 md:w-5 md:h-5 text-indigo-600" />
                                </div>
                                <div className="min-w-0">
                                    <h2 className="font-extrabold text-slate-900 text-sm md:text-base flex items-center gap-1.5 md:gap-2 truncate">
                                        {selectedThread?.userName}
                                        <ShieldCheck className="w-3 h-3 md:w-4 md:h-4 text-blue-500 flex-shrink-0" />
                                    </h2>
                                    <p className="text-[8px] md:text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1 md:gap-1.5 truncate">
                                        <span className="w-1 md:w-1.5 h-1 md:h-1.5 bg-green-500 rounded-full"></span>
                                        Verified Member • ID: {selectedChatId.slice(0, 5)}...
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-1 md:gap-2">
                                <button className="p-2 md:p-2.5 hover:bg-slate-50 rounded-xl transition-colors text-slate-400">
                                    <MoreVertical className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Messages Flow */}
                        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6 bg-slate-50/20 custom-scrollbar pb-24 md:pb-6">
                            {messages.map((msg, idx) => {
                                const isAdmin = msg.senderType === 'admin';
                                const showAvatar = idx === 0 || messages[idx - 1]?.senderType !== msg.senderType;

                                return (
                                    <div
                                        key={msg.id}
                                        className={`flex ${isAdmin ? 'justify-end' : 'justify-start'} group animate-in fade-in slide-in-from-bottom-2 duration-300`}
                                    >
                                        <div className={`flex flex-col max-w-[85%] md:max-w-[70%] ${isAdmin ? 'items-end' : 'items-start'}`}>
                                            {!isAdmin && showAvatar && (
                                                <span className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 tracking-widest">{msg.senderName}</span>
                                            )}

                                            <div
                                                className={`group relative rounded-xl md:rounded-2xl px-3 md:px-4 py-2 md:py-2.5 shadow-sm transition-all ${isAdmin
                                                    ? 'bg-indigo-600 text-white rounded-br-none ring-1 ring-indigo-500'
                                                    : 'bg-white text-slate-800 rounded-bl-none border border-slate-200'
                                                    }`}
                                            >
                                                <p className="text-xs md:text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>

                                                <div className={`mt-1 flex items-center gap-1 justify-end ${isAdmin ? 'text-indigo-200' : 'text-slate-400'
                                                    }`}>
                                                    <span className="text-[8px] md:text-[9px] font-bold">
                                                        {msg.timestamp?.toDate ?
                                                            new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: 'numeric' }).format(msg.timestamp.toDate()) :
                                                            'Sending...'}
                                                    </span>
                                                    {isAdmin && <CheckCheck className="w-3 h-3" />}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} className="h-2" />
                        </div>

                        {/* Premium Input Console */}
                        <div className="absolute bottom-0 left-0 right-0 p-3 md:p-6 bg-white/80 backdrop-blur-md border-t border-slate-100 z-10">
                            <div className="max-w-4xl mx-auto flex items-end gap-2 md:gap-3">
                                <div className="flex-1 relative">
                                    <textarea
                                        rows={1}
                                        placeholder={`Reply to ${selectedThread?.userName.split(' ')[0]}...`}
                                        className="w-full px-4 md:px-5 py-2.5 md:py-3.5 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl text-[13px] md:text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 transition-all resize-none max-h-32 md:max-h-40"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSendReply();
                                            }
                                        }}
                                        onInput={(e) => {
                                            const target = e.target as HTMLTextAreaElement;
                                            target.style.height = 'auto';
                                            target.style.height = `${target.scrollHeight}px`;
                                        }}
                                    />
                                </div>
                                <button
                                    onClick={handleSendReply}
                                    disabled={!newMessage.trim()}
                                    className="h-[42px] md:h-[52px] px-4 md:px-8 bg-indigo-600 text-white rounded-xl md:rounded-2xl font-bold text-xs md:text-sm hover:bg-indigo-700 transition-all disabled:opacity-30 disabled:grayscale active:scale-95 shadow-lg md:shadow-xl shadow-indigo-100 flex items-center gap-2 group"
                                >
                                    <Send className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                    <span className="hidden sm:inline">Reply</span>
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center p-8 md:p-20 text-center">
                        <div className="max-w-sm">
                            <div className="w-16 h-16 md:w-24 md:h-24 bg-slate-50 border border-slate-100 rounded-[1.5rem] md:rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 md:mb-8 shadow-inner">
                                <MessageCircle className="w-8 h-8 md:w-10 md:h-10 text-slate-300" />
                            </div>
                            <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-2 md:mb-3 tracking-tight">Select a conversation</h2>
                            <p className="text-slate-500 text-[11px] md:text-sm leading-relaxed font-medium">
                                Choose a customer thread from the sidebar to view the full interaction history and provide assistance.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
