"use client";

import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Bell, Search, Menu, ChevronDown } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

const pageTitles: Record<string, string> = {
  "/dashboard":     "Dashboard",
  "/items":         "Items",
  "/chats":         "Chats",
  "/drop-zones":    "Drop Zones",
  "/notifications": "Notifications",
  "/settings":      "Settings",
};

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  const title = Object.entries(pageTitles).find(([key]) =>
    pathname.startsWith(key)
  )?.[1] ?? "GhostQR";

  // Real-time unread notification count via Firestore onSnapshot
  useEffect(() => {
    const q = query(collection(db, "notifications"), where("read", "==", false));
    const unsub = onSnapshot(q, snap => {
      setUnreadCount(snap.size);
    }, err => {
      console.warn("Notification listener error:", err);
    });
    return () => unsub();
  }, []);

  return (
    <header className="bg-white border-b border-purple-100 px-4 md:px-6 py-4 flex items-center gap-4 flex-shrink-0 shadow-sm">
      {/* Mobile menu */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-1.5 rounded-lg text-purple-600 hover:bg-purple-50 transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Page title */}
      <h2 className="text-base font-semibold text-purple-900 hidden sm:block">{title}</h2>

      {/* Search */}
      <div className="flex-1 max-w-md ml-auto mr-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search items, chats, users…"
            className="input-field pl-9 h-9"
          />
        </div>
      </div>

      {/* Notification bell — live count */}
      <button
        onClick={() => router.push("/notifications")}
        className="relative p-2 rounded-xl text-gray-500 hover:bg-purple-50 hover:text-purple-600 transition-colors"
        title={unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-sm">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Admin avatar */}
      <div className="flex items-center gap-2 cursor-pointer group">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-purple-700
                        flex items-center justify-center text-white text-xs font-bold shadow-sm">
          A
        </div>
        <div className="hidden md:block">
          <p className="text-sm font-medium text-gray-800 leading-none">Admin</p>
          <p className="text-xs text-gray-400 mt-0.5">GhostQR</p>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-gray-400 hidden md:block" />
      </div>
    </header>
  );
}
