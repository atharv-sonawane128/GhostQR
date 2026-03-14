"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { MessageSquare, Search, Clock, MessagesSquare } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import Link from "next/link";

interface Chat {
  id: string;
  itemId?: string;
  itemName?: string;
  lastMessage?: string;
  status?: string;
  updatedAt?: any;
  unread?: number;
}

export default function ChatsPage() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetch = async () => {
      try {
        const snap = await getDocs(query(collection(db, "chats"), orderBy("updatedAt", "desc")));
        setChats(snap.docs.map(d => ({ id: d.id, ...d.data() } as Chat)));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  const filtered = chats.filter(c =>
    c.itemName?.toLowerCase().includes(search.toLowerCase()) ||
    c.itemId?.toLowerCase().includes(search.toLowerCase())
  );

  const formatTime = (chat: Chat) => {
    if (!chat.updatedAt?.seconds) return "—";
    const d = new Date(chat.updatedAt.seconds * 1000);
    const now = new Date();
    const diffMins = Math.floor((now.getTime() - d.getTime()) / 60000);
    if (diffMins < 1)  return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hr ago`;
    return d.toLocaleDateString("en-GB");
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-purple-900">Anonymous Chats</h1>
        <p className="text-sm text-gray-500">
          {loading ? "Loading…" : `${chats.length} chat${chats.length !== 1 ? "s" : ""}`}
        </p>
      </div>

      <div className="card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text" placeholder="Search chats by item name or ID…"
            value={search} onChange={e => setSearch(e.target.value)}
            className="input-field pl-9 h-9"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
          <MessagesSquare className="w-10 h-10 text-purple-200" />
          <p className="text-sm font-medium">No chats yet.</p>
          <p className="text-xs text-center max-w-xs">
            When someone scans a registered item's QR code, an anonymous chat will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(chat => (
            <Link key={chat.id} href={`/chats/${chat.id}`} className="card-hover p-4 flex items-start gap-4 cursor-pointer group block">
              <div className="w-10 h-10 bg-purple-100 group-hover:bg-purple-200 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors">
                <MessageSquare className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-gray-800 text-sm truncate">{chat.itemName || "Unknown Item"}</p>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {(chat.unread ?? 0) > 0 && (
                      <span className="w-5 h-5 bg-purple-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {chat.unread}
                      </span>
                    )}
                    <StatusBadge status={(chat.status ?? "active") as any} />
                  </div>
                </div>
                <p className="text-xs text-gray-500 truncate mt-0.5">{chat.lastMessage || "No messages yet"}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  {chat.itemId && <span className="text-[11px] font-mono text-gray-400">{chat.itemId.slice(0,12)}…</span>}
                  <span className="flex items-center gap-1 text-[11px] text-gray-400">
                    <Clock className="w-3 h-3" /> {formatTime(chat)}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
