'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { Bell, CheckCheck, QrCode, ShoppingBag, MessageSquare, Info, Trash2, AlertCircle, MapPin, CheckCircle } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';

const ICON_MAP = {
  qr: QrCode,
  order: ShoppingBag,
  chat: MessageSquare,
  scan: AlertCircle,
  scan_location: MapPin,
  dropzone: CheckCircle,
};

import { useRouter } from 'next/navigation';

function timeAgo(ts) {
  if (!ts?.toDate) return '';
  const diff = (Date.now() - ts.toDate().getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Register FCM token and save to Firestore user doc
    const registerFCM = async () => {
      try {
        const { messaging, getToken } = await import('@/lib/firebase').then(m => m.getMessaging());
        if (messaging && 'Notification' in window) {
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
            if (vapidKey && vapidKey !== 'your-vapid-key-for-fcm') {
              const token = await getToken(messaging, { vapidKey });
              if (token) {
                await updateDoc(doc(db, 'users', user.uid), { fcmToken: token });
              }
            }
          }
        }
      } catch (err) { 
        console.error('FCM registration failed:', err); 
      }
    };
    registerFCM();

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid)
    );

    const unsub = onSnapshot(q, snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sort client-side to avoid requiring a composite index in Firestore during dev
      data.sort((a, b) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0));
      setNotifications(data);
      setLoading(false);
    }, (err) => {
      console.error(err);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.read);
    await Promise.all(unread.map(n => updateDoc(doc(db, 'notifications', n.id), { read: true })));
    if (unread.length > 0) toast.success('All marked as read');
  };

  const deleteNotification = async (id, e) => {
    e.stopPropagation();
    try {
      await deleteDoc(doc(db, 'notifications', id));
      toast.success('Notification removed');
    } catch (err) {
      toast.error('Failed to remove notification');
    }
  };

  const handleNotificationClick = async (n) => {
    if (!n.read) {
      await updateDoc(doc(db, 'notifications', n.id), { read: true });
    }

    if (n.type === 'chat' && n.chatId) {
      router.push(`/chats`); // Since it's a split view now, we go to /chats
    } else if (n.type === 'scan_location' || n.type === 'dropzone') {
      router.push(`/dashboard`);
    } else if (n.type === 'order') {
      router.push(`/dashboard`);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ghost-100">Notifications</h1>
          <p className="text-ghost-300 text-sm mt-1">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 text-xs text-ghost-accent-light hover:text-ghost-100 transition-colors"
          >
            <CheckCheck className="w-4 h-4" />
            Mark all read
          </button>
        )}
      </div>

      {/* FCM hint */}
      <div className="glass p-4 flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Info className="w-4 h-4 text-blue-400" />
        </div>
        <div>
          <p className="text-xs font-medium text-ghost-200">Push Notifications</p>
          <p className="text-xs text-ghost-400 mt-0.5">
            Allow notifications when prompted to receive real-time alerts when someone scans your QR code.
          </p>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-2">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass p-5 flex gap-4 animate-pulse">
              <div className="w-10 h-10 rounded-xl bg-ghost-700/60 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-ghost-700 rounded w-1/2" />
                <div className="h-2.5 bg-ghost-700/60 rounded w-3/4" />
              </div>
            </div>
          ))
        ) : notifications.length === 0 ? (
          <div className="glass p-12 text-center">
            <Bell className="w-10 h-10 text-ghost-600 mx-auto mb-3" />
            <p className="text-ghost-300 font-medium">No notifications yet</p>
            <p className="text-ghost-500 text-xs mt-1">You'll be notified when someone scans your QR code</p>
          </div>
        ) : notifications.map(n => {
          const Icon = ICON_MAP[n.type] || Bell;
          return (
            <div
              key={n.id}
              onClick={() => handleNotificationClick(n)}
              className={clsx(
                'glass p-5 flex items-start gap-4 transition-all hover:border-ghost-accent/25 group cursor-pointer',
                !n.read && 'border-ghost-accent/25 bg-ghost-accent/5'
              )}
            >
              <div className="w-10 h-10 rounded-xl bg-ghost-accent/20 flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-ghost-accent-light" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={clsx('text-sm font-semibold', n.read ? 'text-ghost-200' : 'text-ghost-100')}>
                    {n.title}
                  </p>
                  <span className="text-[11px] text-ghost-500 flex-shrink-0">{timeAgo(n.timestamp)}</span>
                </div>
                <p className="text-xs text-ghost-400 mt-0.5 leading-relaxed">{n.message}</p>
              </div>
              
              <div className="flex flex-col gap-2 items-center flex-shrink-0">
                {!n.read && (
                  <div className="w-2 h-2 rounded-full bg-ghost-accent-light mt-1.5" />
                )}
                <button
                  onClick={(e) => deleteNotification(n.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-ghost-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                  title="Delete notification"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
