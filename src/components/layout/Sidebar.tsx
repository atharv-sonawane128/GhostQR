"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  LayoutDashboard, PackageSearch, MessageSquare,
  MapPin, Bell, Settings, Ghost, X, QrCode,
} from "lucide-react";

const navItems = [
  { href: "/dashboard",    icon: LayoutDashboard, label: "Dashboard"    },
  { href: "/items",        icon: PackageSearch,   label: "Items"         },
  { href: "/chats",        icon: MessageSquare,   label: "Chats"         },
  { href: "/drop-zones",   icon: MapPin,          label: "Drop Zones"    },
  { href: "/notifications",icon: Bell,            label: "Notifications" },
  { href: "/settings",     icon: Settings,        label: "Settings"      },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);

  // Real-time unread notification count
  useEffect(() => {
    const q = query(collection(db, "notifications"), where("read", "==", false));
    const unsub = onSnapshot(q, snap => setUnreadCount(snap.size), () => {});
    return () => unsub();
  }, []);

  return (
    <>
      <aside
        className={`
          fixed top-0 left-0 z-30 h-full w-64 flex-shrink-0
          bg-gradient-to-b from-purple-800 via-purple-700 to-purple-900
          shadow-2xl transition-transform duration-300 ease-in-out
          lg:relative lg:translate-x-0 lg:z-auto
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Ghost className="text-white w-5 h-5" />
            </div>
            <div>
              <h1 className="text-white font-bold text-base leading-tight">GhostQR</h1>
              <p className="text-purple-300 text-xs">Admin Panel</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden text-purple-300 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="px-3 py-4 space-y-1">
          <p className="text-purple-400 text-[10px] uppercase tracking-widest font-semibold px-3 mb-3">
            Main Menu
          </p>
          {navItems.map(({ href, icon: Icon, label }) => {
            const isActive = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={isActive ? "nav-link-active" : "nav-link"}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{label}</span>
                {label === "Notifications" && unreadCount > 0 && (
                  <span className="ml-auto bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Register QR */}
        <div className="absolute bottom-6 left-3 right-3">
          <Link
            href="/items/new"
            className="btn-secondary bg-white/10 hover:bg-white/20 text-white w-full justify-center"
          >
            <QrCode className="w-4 h-4" />
            Register New Item
          </Link>
        </div>
      </aside>
    </>
  );
}
