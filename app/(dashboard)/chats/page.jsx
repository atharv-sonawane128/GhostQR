'use client';

import { useEffect, useState, useRef } from 'react';
import {
  collection, query, where, onSnapshot, orderBy,
  addDoc, serverTimestamp, doc, getDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { Send, MessageSquare, Ghost, ArrowLeft } from 'lucide-react';
import clsx from 'clsx';

function formatTime(ts) {
  if (!ts?.toDate) return '';
  return ts.toDate().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export default function ChatsPage() {
  const { user, userData } = useAuth();
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  // Load chats for this user (as owner)
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'chats'),
      where('ownerId', '==', user.uid)
    );

    const unsub = onSnapshot(q, snap => {
      setChats(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [user]);

  // Load messages for active chat
  useEffect(() => {
    if (!activeChat) return;
    const q = query(
      collection(db, 'messages'),
      where('chatId', '==', activeChat.id)
    );
    const unsub = onSnapshot(q, snap => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      msgs.sort((a, b) => (a.timestamp?.toMillis() || 0) - (b.timestamp?.toMillis() || 0));
      setMessages(msgs);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
    return () => unsub();
  }, [activeChat]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMsg.trim() || !activeChat) return;
    setSending(true);
    try {
      await addDoc(collection(db, 'messages'), {
        chatId: activeChat.id,
        senderId: user.uid,
        message: newMsg.trim(),
        timestamp: serverTimestamp(),
      });
      setNewMsg('');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ghost-100">Chats</h1>
        <p className="text-ghost-300 text-sm mt-1">Anonymous conversations about your QR items</p>
      </div>

      <div className="glass overflow-hidden" style={{ height: 'calc(100vh - 220px)', minHeight: '500px' }}>
        <div className="flex h-full relative">
          {/* Chat List */}
          <div className={clsx(
            "w-full sm:w-72 flex-shrink-0 border-r border-ghost-600/30 flex flex-col transition-all duration-300",
            activeChat ? "hidden sm:flex" : "flex"
          )}>
            <div className="p-4 border-b border-ghost-600/30">
              <p className="text-xs font-medium text-ghost-400 uppercase tracking-wider">Conversations ({chats.length})</p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {chats.length === 0 ? (
                <div className="p-6 text-center text-ghost-400 text-sm">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 text-ghost-600" />
                  No conversations yet
                </div>
              ) : chats.map(chat => (
                <button
                  key={chat.id}
                  onClick={() => setActiveChat(chat)}
                  className={clsx(
                    'w-full flex items-center gap-3 p-4 text-left transition-colors border-b border-ghost-700/20',
                    activeChat?.id === chat.id ? 'bg-ghost-accent/10' : 'hover:bg-ghost-700/20'
                  )}
                >
                  <div className="w-9 h-9 rounded-full flex items-center justify-center bg-ghost-500/40 flex-shrink-0">
                    <Ghost className="w-4 h-4 text-ghost-accent-light" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-medium text-ghost-100 truncate">{chat.itemName || `Chat #${chat.id.slice(0, 6)}`}</p>
                    <p className="text-xs text-ghost-400 truncate">
                      {chat.ownerId === user?.uid ? 'You own this QR' : 'You found this QR'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Message Area */}
          <div className={clsx(
            "flex-1 flex flex-col transition-all duration-300",
            activeChat ? "flex" : "hidden sm:flex"
          )}>
            {!activeChat ? (
              <div className="flex-1 flex items-center justify-center text-center">
                <div>
                  <MessageSquare className="w-12 h-12 text-ghost-600 mx-auto mb-3" />
                  <p className="text-ghost-300 font-medium">Select a conversation</p>
                  <p className="text-ghost-500 text-sm mt-1">Choose a chat from the left to start messaging</p>
                </div>
              </div>
            ) : (
              <>
                <div className="p-4 border-b border-ghost-600/30 flex items-center gap-3">
                  <button 
                    onClick={() => setActiveChat(null)}
                    className="p-1.5 rounded-lg hover:bg-ghost-700 text-ghost-400 sm:hidden"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div className="overflow-hidden">
                    <p className="font-semibold text-ghost-100 text-sm truncate">{activeChat.itemName || `Chat #${activeChat.id.slice(0, 8)}`}</p>
                    <p className="text-xs text-ghost-400">Anonymous · End-to-end encrypted</p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.length === 0 && (
                    <div className="text-center text-ghost-500 text-sm py-8">No messages yet. Say hello!</div>
                  )}
                  {messages.map(m => {
                    const isMine = m.senderId === user?.uid;
                    return (
                      <div key={m.id} className={clsx('flex', isMine ? 'justify-end' : 'justify-start')}>
                        <div className={clsx(
                          'max-w-[75%] px-4 py-2.5 rounded-2xl text-sm',
                          isMine
                            ? 'bg-ghost-accent text-white rounded-br-sm'
                            : 'bg-ghost-700/60 text-ghost-100 rounded-bl-sm'
                        )}>
                          <p>{m.message}</p>
                          <p className={clsx('text-[10px] mt-1', isMine ? 'text-purple-200' : 'text-ghost-400')}>
                            {formatTime(m.timestamp)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>

                <form onSubmit={sendMessage} className="p-4 border-t border-ghost-600/30 flex gap-3">
                  <input
                    value={newMsg}
                    onChange={e => setNewMsg(e.target.value)}
                    className="ghost-input flex-1"
                    placeholder="Type a message..."
                    disabled={sending}
                  />
                  <button
                    type="submit"
                    disabled={!newMsg.trim() || sending}
                    className="btn-ghost px-4 py-2.5 flex-shrink-0 disabled:opacity-60"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
