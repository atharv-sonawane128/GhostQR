"use client";

import { useEffect, useState, useRef, use } from "react";
import { db } from "@/lib/firebase";
import {
  doc, getDoc, collection, addDoc, onSnapshot, query,
  orderBy, serverTimestamp, updateDoc,
} from "firebase/firestore";
import { encryptMessage, decryptMessage } from "@/lib/crypto";
import {
  ArrowLeft, Send, Package, Clock, Ghost,
  ShieldCheck, Lock, MessageSquare,
} from "lucide-react";
import Link from "next/link";
import StatusBadge from "@/components/ui/StatusBadge";

interface RawMessage {
  id: string;
  text: string;       // encrypted base64
  sender: "finder" | "owner";
  sentAt?: any;
}

interface Message extends RawMessage {
  decryptedText: string;
}

interface Chat {
  itemId?: string;
  itemName?: string;
  status?: string;
  updatedAt?: any;
}

export default function AdminChatPage({ params }: { params: Promise<{ chatId: string }> }) {
  const { chatId } = use(params);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chat, setChat] = useState<Chat | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Fetch chat metadata
  useEffect(() => {
    getDoc(doc(db, "chats", chatId)).then(snap => {
      if (snap.exists()) setChat(snap.data() as Chat);
    }).catch(console.error);
  }, [chatId]);

  // Real-time messages + decrypt
  useEffect(() => {
    const q = query(collection(db, "chats", chatId, "messages"), orderBy("sentAt", "asc"));
    const unsub = onSnapshot(q, async snap => {
      const decrypted = await Promise.all(
        snap.docs.map(async d => {
          const raw = { id: d.id, ...d.data() } as RawMessage;
          return {
            ...raw,
            decryptedText: await decryptMessage(raw.text, chatId),
          } as Message;
        })
      );
      setMessages(decrypted);
      setLoading(false);
      // Reset unread when admin opens
      updateDoc(doc(db, "chats", chatId), { unread: 0 }).catch(() => {});
    });
    return () => unsub();
  }, [chatId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setText("");
    try {
      // Encrypt before storing
      const encrypted = await encryptMessage(trimmed, chatId);
      await addDoc(collection(db, "chats", chatId, "messages"), {
        text: encrypted,
        sender: "owner",
        sentAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "chats", chatId), {
        lastMessage: "🔒 Encrypted message",
        updatedAt: serverTimestamp(),
        unread: 0,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (msg: Message) => {
    if (!msg.sentAt?.seconds) return "";
    return new Date(msg.sentAt.seconds * 1000).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (msg: Message) => {
    if (!msg.sentAt?.seconds) return "";
    return new Date(msg.sentAt.seconds * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-3xl mx-auto">
      {/* Header */}
      <div className="card p-4 flex items-center gap-4 mb-4 flex-shrink-0">
        <Link href="/chats" className="p-2 rounded-xl hover:bg-purple-50 text-gray-400 hover:text-purple-600 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <MessageSquare className="w-5 h-5 text-purple-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-gray-800 text-sm truncate">{chat?.itemName ?? "Anonymous Chat"}</p>
            {chat?.status && <StatusBadge status={chat.status as any} />}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            {chat?.itemId && (
              <span className="flex items-center gap-1 text-[11px] text-gray-400">
                <Package className="w-3 h-3" />
                <span className="font-mono">{chat.itemId.slice(0, 12)}…</span>
              </span>
            )}
            <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
              <Lock className="w-3 h-3" /> E2E Encrypted
            </span>
          </div>
        </div>
      </div>

      {/* E2E notice */}
      <div className="card px-4 py-2.5 mb-4 flex items-center gap-2 flex-shrink-0 border border-emerald-100 bg-emerald-50/60">
        <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
        <p className="text-xs text-emerald-700">Messages are end-to-end encrypted with AES-256. Firestore stores only encrypted data.</p>
      </div>

      {/* Messages area */}
      <div className="card flex-1 overflow-y-auto p-5 space-y-3 mb-4">
        {loading ? (
          <div className="flex justify-center pt-10">
            <div className="w-5 h-5 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 gap-3">
            <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center">
              <Ghost className="w-7 h-7 text-purple-300" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">No messages yet</p>
              <p className="text-xs mt-0.5">The finder hasn't sent a message. You can send one first.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-center">
              <span className="text-[11px] text-gray-400 bg-gray-50 px-3 py-1 rounded-full">
                {messages[0]?.sentAt?.seconds
                  ? new Date(messages[0].sentAt.seconds * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "long" })
                  : "Today"}
              </span>
            </div>

            {messages.map((msg, i) => {
              const isOwner = msg.sender === "owner";
              const showDate = i > 0 && formatDate(msg) !== formatDate(messages[i - 1]);
              return (
                <div key={msg.id}>
                  {showDate && (
                    <div className="flex items-center justify-center my-2">
                      <span className="text-[11px] text-gray-400 bg-gray-50 px-3 py-1 rounded-full">{formatDate(msg)}</span>
                    </div>
                  )}
                  <div className={`flex ${isOwner ? "justify-end" : "justify-start"}`}>
                    {!isOwner && (
                      <div className="w-7 h-7 bg-purple-100 rounded-full flex items-center justify-center mr-2 mt-1 flex-shrink-0 self-end">
                        <Ghost className="w-3.5 h-3.5 text-purple-500" />
                      </div>
                    )}
                    <div className={`max-w-[72%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                      isOwner
                        ? "bg-purple-600 text-white rounded-br-md"
                        : "bg-gray-100 text-gray-800 rounded-bl-md"
                    }`}>
                      <p>{msg.decryptedText}</p>
                      <p className={`text-[10px] mt-1 ${isOwner ? "text-purple-200 text-right" : "text-gray-400"}`}>
                        {isOwner ? "You (Owner)" : "Finder"} · {formatTime(msg)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="card p-4 flex gap-3 flex-shrink-0">
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
          placeholder="Reply to finder (end-to-end encrypted)…"
          className="flex-1 bg-purple-50 border border-purple-100 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent placeholder-gray-400"
        />
        <button
          onClick={sendMessage}
          disabled={!text.trim() || sending}
          className="w-10 h-10 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-xl flex items-center justify-center transition-all flex-shrink-0"
        >
          {sending
            ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <Send className="w-4 h-4" />
          }
        </button>
      </div>
    </div>
  );
}
