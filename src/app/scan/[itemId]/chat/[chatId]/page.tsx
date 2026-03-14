"use client";

import { useEffect, useState, useRef, use } from "react";
import { db } from "@/lib/firebase";
import {
  doc, getDoc, collection, addDoc, onSnapshot,
  query, orderBy, serverTimestamp, updateDoc, increment,
} from "firebase/firestore";
import { encryptMessage, decryptMessage } from "@/lib/crypto";
import { Ghost, Send, ArrowLeft, ShieldCheck, Lock } from "lucide-react";
import Link from "next/link";

interface RawMessage {
  id: string;
  text: string;        // encrypted base64
  sender: "finder" | "owner";
  sentAt?: any;
}

interface Message extends RawMessage {
  decryptedText: string; // decrypted for display
}

export default function ChatPage({ params }: { params: Promise<{ itemId: string; chatId: string }> }) {
  const { itemId, chatId } = use(params);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [itemName, setItemName] = useState("");
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Fetch item name
  useEffect(() => {
    getDoc(doc(db, "items", itemId)).then(s => {
      if (s.exists()) setItemName(s.data().name ?? "");
    });
  }, [itemId]);

  // Real-time messages with decryption
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
      // Encrypt before storing in Firestore
      const encrypted = await encryptMessage(trimmed, chatId);
      await addDoc(collection(db, "chats", chatId, "messages"), {
        text: encrypted,
        sender: "finder",
        sentAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "chats", chatId), {
        lastMessage: "🔒 Encrypted message",
        updatedAt: serverTimestamp(),
        unread: increment(1),
      });
    } catch (e) { console.error(e); }
    finally { setSending(false); }
  };

  const formatTime = (msg: Message) => {
    if (!msg.sentAt?.seconds) return "";
    return new Date(msg.sentAt.seconds * 1000).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-800 via-purple-700 to-purple-900 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm flex flex-col overflow-hidden shadow-2xl" style={{ height: "88vh", maxHeight: 680 }}>

        {/* Header */}
        <div className="bg-gradient-to-r from-purple-700 to-purple-900 px-4 py-4 flex items-center gap-3 flex-shrink-0">
          <Link href={`/scan/${itemId}`} className="text-white/70 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
            <Ghost className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm leading-none truncate">{itemName || "Item Chat"}</p>
            <p className="text-purple-300 text-[11px] mt-0.5">Anonymous Chat</p>
          </div>
          <div className="flex items-center gap-1 text-emerald-300 text-[10px] font-semibold">
            <Lock className="w-3 h-3" /> E2E Encrypted
          </div>
        </div>

        {/* Privacy banner */}
        <div className="bg-purple-50 border-b border-purple-100 px-4 py-2 flex items-center gap-1.5 flex-shrink-0">
          <ShieldCheck className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
          <p className="text-[11px] text-purple-600">Messages are end-to-end encrypted. Not readable by anyone else.</p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {loading ? (
            <div className="flex justify-center pt-8">
              <div className="w-5 h-5 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 space-y-2 pt-8">
              <Ghost className="w-10 h-10 text-purple-200" />
              <p className="text-sm font-medium text-gray-600">Chat started!</p>
              <p className="text-xs text-gray-400 max-w-[220px]">
                Send a message to the owner anonymously. They can reply here.
              </p>
            </div>
          ) : (
            messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.sender === "finder" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  msg.sender === "finder"
                    ? "bg-purple-600 text-white rounded-br-md"
                    : "bg-gray-100 text-gray-800 rounded-bl-md"
                }`}>
                  <p>{msg.decryptedText}</p>
                  <p className={`text-[10px] mt-1 ${msg.sender === "finder" ? "text-purple-200" : "text-gray-400"}`}>
                    {msg.sender === "finder" ? "You" : "Owner"} · {formatTime(msg)}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-100 px-4 py-4 flex gap-2 flex-shrink-0">
          <input
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && sendMessage()}
            placeholder="Type a message…"
            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
          />
          <button
            onClick={sendMessage}
            disabled={!text.trim() || sending}
            className="w-10 h-10 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-xl flex items-center justify-center transition-all flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
