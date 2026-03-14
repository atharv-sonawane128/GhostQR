"use client";

import { useEffect, useState, use } from "react";
import { doc, getDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { MessageSquare, MapPin, Ghost, CheckCircle, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";

interface Item {
  name: string;
  category?: string;
  description?: string;
  imageBase64?: string;
  status?: string;
}

export default function ScanPage({ params }: { params: Promise<{ itemId: string }> }) {
  const router = useRouter();
  const { itemId } = use(params);

  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [alertSent, setAlertSent] = useState(false);
  const [starting, setStarting] = useState<"chat" | "drop" | null>(null);

  useEffect(() => {
    const fetchItem = async () => {
      try {
        const docSnap = await getDoc(doc(db, "items", itemId));
        if (!docSnap.exists()) { setNotFound(true); setLoading(false); return; }
        const data = docSnap.data() as Item;
        // Only expose safe public fields — NEVER owner name/contact
        setItem({
          name:        data.name,
          category:    data.category,
          description: data.description,
          imageBase64: data.imageBase64,
          status:      data.status,
        });
        setLoading(false);
      } catch (e) {
        console.error("Failed to fetch item:", e);
        setNotFound(true);
        setLoading(false);
      }

      // Log scan notification separately — failure here must NOT break the page
      try {
        const docSnap = await getDoc(doc(db, "items", itemId));
        if (docSnap.exists()) {
          await addDoc(collection(db, "notifications"), {
            type:        "scan",
            title:       "Item Scanned",
            description: `"${docSnap.data().name}" QR was scanned by a finder.`,
            itemId,
            read:        false,
            createdAt:   serverTimestamp(),
          });
          setAlertSent(true);
        }
      } catch (e) {
        // Silently ignore — notification logging is best-effort
        console.warn("Could not log scan notification:", e);
      }
    };
    fetchItem();
  }, [itemId]);

  const startChat = async () => {
    setStarting("chat");
    try {
      // Check localStorage for an existing chat session for this item
      const lsKey = `ghostqr_chat_${itemId}`;
      const existingChatId = localStorage.getItem(lsKey);

      if (existingChatId) {
        // Resume existing chat — no new Firestore document created
        router.push(`/scan/${itemId}/chat/${existingChatId}`);
        return;
      }

      // No existing chat → create a new one
      const chatRef = await addDoc(collection(db, "chats"), {
        itemId,
        itemName:    item?.name ?? "Unknown",
        status:      "active",
        lastMessage: "",
        unread:      0,
        createdAt:   serverTimestamp(),
        updatedAt:   serverTimestamp(),
      });

      // Persist chatId locally so the finder can always return to this chat
      localStorage.setItem(lsKey, chatRef.id);

      // Log notification (best-effort)
      try {
        await addDoc(collection(db, "notifications"), {
          type:        "chat",
          title:       "New Chat Started",
          description: `A finder started a chat about "${item?.name}".`,
          itemId,
          read:        false,
          createdAt:   serverTimestamp(),
        });
      } catch (_) {}

      router.push(`/scan/${itemId}/chat/${chatRef.id}`);
    } catch (e) {
      console.error(e);
      setStarting(null);
    }
  };

  const goToDropZones = () => {
    setStarting("drop");
    router.push(`/scan/${itemId}/drop`);
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-800 to-purple-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  // ── Not found ──────────────────────────────────────────────────────────────
  if (notFound || !item) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-800 to-purple-950 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center space-y-4">
          <div className="w-14 h-14 bg-rose-100 rounded-2xl flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7 text-rose-500" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Item Not Found</h2>
          <p className="text-sm text-gray-500">This QR code is invalid or the item has been removed.</p>
        </div>
      </div>
    );
  }

  // ── Already returned ───────────────────────────────────────────────────────
  if (item.status === "returned") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-800 to-purple-950 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center space-y-4">
          <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto">
            <CheckCircle className="w-7 h-7 text-emerald-500" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Already Returned</h2>
          <p className="text-sm text-gray-500">This item has already been returned to its owner. Thank you!</p>
        </div>
      </div>
    );
  }

  // ── Main scan page ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-800 via-purple-700 to-purple-900 flex flex-col items-center justify-center p-4">
      {/* Card */}
      <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">

        {/* Header branding */}
        <div className="bg-gradient-to-r from-purple-700 to-purple-900 px-6 py-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
            <Ghost className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-none">GhostQR</p>
            <p className="text-purple-300 text-[11px]">Lost & Found</p>
          </div>
          {alertSent && (
            <span className="ml-auto flex items-center gap-1 bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold px-2 py-1 rounded-full border border-emerald-400/30">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              Owner Alerted
            </span>
          )}
        </div>

        {/* Item image */}
        {item.imageBase64 ? (
          <div className="relative">
            <img
              src={item.imageBase64}
              alt={item.name}
              className="w-full h-52 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            {item.category && (
              <span className="absolute bottom-3 left-3 bg-white/90 text-purple-700 text-xs font-semibold px-2.5 py-1 rounded-full backdrop-blur-sm">
                {item.category}
              </span>
            )}
          </div>
        ) : (
          <div className="h-40 bg-purple-50 flex items-center justify-center">
            <Ghost className="w-12 h-12 text-purple-200" />
          </div>
        )}

        {/* Item info — name only, NO owner info */}
        <div className="px-6 pt-5 pb-2 space-y-1">
          <h1 className="text-xl font-bold text-gray-900">{item.name}</h1>
          {item.description && (
            <p className="text-sm text-gray-500 leading-relaxed">{item.description}</p>
          )}
        </div>

        {/* Privacy notice */}
        <div className="mx-6 mt-3 bg-purple-50 border border-purple-100 rounded-xl px-3 py-2.5 text-xs text-purple-700 leading-relaxed">
          🔒 <span className="font-semibold">Privacy protected.</span> The owner's identity is kept anonymous. You can return this item in two ways:
        </div>

        {/* Action buttons */}
        <div className="p-6 pt-4 space-y-3">
          <button
            onClick={startChat}
            disabled={starting !== null}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white font-semibold py-4 px-4 rounded-2xl transition-all duration-200 flex items-center gap-4 shadow-lg hover:shadow-purple-500/30 active:scale-[0.98]"
          >
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="font-bold text-sm leading-none">Chat Anonymously</p>
              <p className="text-purple-200 text-xs mt-0.5">Message the owner without revealing yourself</p>
            </div>
            {starting === "chat" && (
              <div className="ml-auto w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin flex-shrink-0" />
            )}
          </button>

          <button
            onClick={goToDropZones}
            disabled={starting !== null}
            className="w-full bg-white hover:bg-purple-50 disabled:opacity-60 text-purple-700 font-semibold py-4 px-4 rounded-2xl border-2 border-purple-200 transition-all duration-200 flex items-center gap-4 active:scale-[0.98]"
          >
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5 text-purple-600" />
            </div>
            <div className="text-left">
              <p className="font-bold text-sm leading-none text-gray-800">Drop at a Drop Zone</p>
              <p className="text-gray-400 text-xs mt-0.5">Leave it at a nearby safe collection point</p>
            </div>
            {starting === "drop" && (
              <div className="ml-auto w-5 h-5 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin flex-shrink-0" />
            )}
          </button>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 text-center">
          <p className="text-xs text-gray-400">Thank you for being honest 💜</p>
        </div>
      </div>
    </div>
  );
}
