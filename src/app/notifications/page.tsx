"use client";

import { useEffect, useState } from "react";
import { collection, query, orderBy, deleteDoc, doc, writeBatch, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Bell, Scan, MessageSquare, MapPin, CheckCircle, Clock, BellOff, Trash2, X, Check } from "lucide-react";

interface Notification {
  id: string;
  type?: string;
  title?: string;
  description?: string;
  read?: boolean;
  createdAt?: any;
}

const iconMap: Record<string, { icon: typeof Bell; bg: string; color: string }> = {
  scan:    { icon: Scan,          bg: "bg-purple-100",  color: "text-purple-600"  },
  chat:    { icon: MessageSquare, bg: "bg-blue-100",    color: "text-blue-600"    },
  drop:    { icon: MapPin,        bg: "bg-amber-100",   color: "text-amber-600"   },
  found:   { icon: CheckCircle,   bg: "bg-emerald-100", color: "text-emerald-600" },
  default: { icon: Bell,          bg: "bg-gray-100",    color: "text-gray-500"    },
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [clearingAll, setClearingAll] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "notifications"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, snap => {
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification)));
      setLoading(false);
    }, e => { console.error(e); setLoading(false); });
    return () => unsub();
  }, []);

  const deleteNotification = async (id: string) => {
    setDeleting(id);
    try {
      await deleteDoc(doc(db, "notifications", id));
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (e) { console.error(e); }
    finally { setDeleting(null); }
  };

  const clearAll = async () => {
    if (!notifications.length) return;
    setClearingAll(true);
    try {
      const batch = writeBatch(db);
      notifications.forEach(n => batch.delete(doc(db, "notifications", n.id)));
      await batch.commit();
    } catch (e) { console.error(e); }
    finally { setClearingAll(false); }
  };

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, "notifications", id), { read: true });
    } catch (e) { console.error(e); }
  };

  const markAllAsRead = async () => {
    const unreadOnes = notifications.filter(n => !n.read);
    if (!unreadOnes.length) return;
    try {
      const batch = writeBatch(db);
      unreadOnes.forEach(n => batch.update(doc(db, "notifications", n.id), { read: true }));
      await batch.commit();
    } catch (e) { console.error(e); }
  };

  const unread = notifications.filter(n => !n.read).length;

  const formatTime = (n: Notification) => {
    if (!n.createdAt?.seconds) return "—";
    const d = new Date(n.createdAt.seconds * 1000);
    const now = new Date();
    const diffMins = Math.floor((now.getTime() - d.getTime()) / 60000);
    if (diffMins < 1)    return "Just now";
    if (diffMins < 60)   return `${diffMins} min ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hr ago`;
    return d.toLocaleDateString("en-GB");
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-purple-900">Notifications</h1>
          <p className="text-sm text-gray-500">
            {loading ? "Loading…" : unread > 0 ? `${unread} unread` : "All caught up"}
          </p>
        </div>
        {notifications.length > 0 && (
          <div className="flex items-center gap-2">
            {unread > 0 && (
              <button
                onClick={markAllAsRead}
                className="btn-secondary text-xs flex items-center gap-1.5 text-purple-600 hover:bg-purple-50 border-purple-200"
              >
                <Check className="w-3.5 h-3.5" />
                Mark All Read
              </button>
            )}
            <button
              onClick={clearAll}
              disabled={clearingAll}
              className="btn-secondary text-xs flex items-center gap-1.5 text-rose-600 hover:bg-rose-50 border-rose-200"
            >
              {clearingAll
                ? <div className="w-3.5 h-3.5 border border-rose-400 border-t-transparent rounded-full animate-spin" />
                : <Trash2 className="w-3.5 h-3.5" />
              }
              Clear All
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
          <BellOff className="w-10 h-10 text-purple-200" />
          <p className="text-sm font-medium">No notifications yet.</p>
          <p className="text-xs text-center max-w-xs">
            Notifications will appear here when items are scanned, chats are started, or items are dropped.
          </p>
        </div>
      ) : (
        <div className="card divide-y divide-purple-50">
          {notifications.map(n => {
            const cfg = iconMap[n.type ?? "default"] ?? iconMap.default;
            const Icon = cfg.icon;
            return (
              <div
                key={n.id}
                className={`flex gap-4 px-5 py-4 transition-colors group ${!n.read ? "bg-purple-50/40" : "hover:bg-gray-50"}`}
              >
                <div className={`w-9 h-9 ${cfg.bg} rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5`}>
                  <Icon className={`w-4 h-4 ${cfg.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-800 text-sm">{n.title || "Notification"}</p>
                    {!n.read && <span className="w-2 h-2 bg-purple-500 rounded-full flex-shrink-0" />}
                  </div>
                  {n.description && <p className="text-xs text-gray-500 mt-0.5">{n.description}</p>}
                  <div className="flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <p className="text-[11px] text-gray-400">{formatTime(n)}</p>
                  </div>
                </div>

                {/* Action buttons — visible on hover */}
                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 flex-shrink-0 self-center transition-all">
                  {!n.read && (
                    <button
                      onClick={() => markAsRead(n.id)}
                      title="Mark as read"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(n.id)}
                    disabled={deleting === n.id}
                    title="Delete"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    {deleting === n.id
                      ? <div className="w-4 h-4 border border-rose-400 border-t-transparent rounded-full animate-spin" />
                      : <X className="w-4 h-4" />
                    }
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
