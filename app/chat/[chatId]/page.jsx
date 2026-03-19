'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, setDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { Send, ArrowLeft, AlertCircle, ShieldCheck, MessageCircle, CheckCircle } from 'lucide-react';

export default function ChatPage() {
  const { chatId } = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chatData, setChatData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [confirmingReward, setConfirmingReward] = useState(false);
  const [itemReturned, setItemReturned] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Determine the current user's ID
    const finderId = localStorage.getItem('ghost_finder_id');
    const uid = user ? user.uid : finderId;
    setCurrentUserId(uid);

    const fetchChatInfo = async () => {
      try {
        if (!chatId) return;
        const chatSnap = await getDoc(doc(db, 'chats', chatId));

        if (chatSnap.exists()) {
          const data = { id: chatSnap.id, ...chatSnap.data() };
          if (data.qrId) {
            const qrSnap = await getDoc(doc(db, 'qrcodes', data.qrId));
            if (qrSnap.exists()) {
               data.itemName = qrSnap.data().itemName;
               if (qrSnap.data().status === 'returned') {
                 setItemReturned(true);
               }
            }
          }
          setChatData(data);
        } else {
          setError('Chat not found or has been closed.');
        }
      } catch (err) {
        console.error('Error fetching chat:', err);
        setError('Failed to load chat.');
      } finally {
        setLoading(false);
      }
    };

    fetchChatInfo();
  }, [chatId, user]);

  useEffect(() => {
    if (!chatId) return;

    const messagesRef = collection(db, 'messages');
    const q = query(
      messagesRef,
      where('chatId', '==', chatId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Client-side sort to avoid index requirements during dev
      msgs.sort((a, b) => (a.timestamp?.toMillis() || 0) - (b.timestamp?.toMillis() || 0));
      setMessages(msgs);
      scrollToBottom();
    }, (err) => {
      console.error("Error fetching messages:", err);
      // Depending on indexes, you might get an error if the composite index doesn't exist yet.
      // Make sure the Firestore index (chatId ASC, timestamp ASC) is created.
    });

    return () => unsubscribe();
  }, [chatId]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleConfirmReturned = async () => {
    if (!chatData || !isOwner) return;
    if (!window.confirm("Are you sure you want to mark this item as returned? This will securely disburse the Ghost Coin reward to the anonymous finder.")) return;

    setConfirmingReward(true);
    try {
      const qrRef = doc(db, 'qrcodes', chatData.qrId);
      const qrSnap = await getDoc(qrRef);
      if (!qrSnap.exists()) throw new Error("QR not found");

      const qrInfo = qrSnap.data();
      if (qrInfo.status === 'returned') {
        alert("This item is already marked as returned.");
        setItemReturned(true);
        return;
      }

      const rewardAmount = Number(qrInfo.reward) || 0;
      let coinsToGive = 0;

      if (rewardAmount > 0) {
        // Ghost Coins rule: 10% of real payment reward
        coinsToGive = Math.floor(rewardAmount * 0.1);

        if (coinsToGive > 0) {
          // 1. Update finder's ghostCoins securely supporting anonymous initial states.
          const finderRef = doc(db, 'users', chatData.finderId);
          await setDoc(finderRef, {
            ghostCoins: increment(coinsToGive)
          }, { merge: true });

          // 2. Log reward details for system integrity
          await addDoc(collection(db, 'rewards'), {
            qrId: chatData.qrId,
            finderId: chatData.finderId,
            ownerId: currentUserId,
            rewardAmount: rewardAmount,
            coins: coinsToGive,
            method: 'chat_confirmation',
            timestamp: serverTimestamp()
          });
        }
      }

      // 3. Mark the QR Code as returned to finish flow
      await updateDoc(qrRef, { status: 'returned' });

      // 4. Send an automatic success message to the chat
      await addDoc(collection(db, 'messages'), {
        chatId,
        senderId: 'system',
        message: `System: The owner has confirmed the item was safely returned! ${coinsToGive > 0 ? `The finder has earned ${coinsToGive} Ghost Coins! 🎉` : ''}`,
        timestamp: serverTimestamp()
      });

      setItemReturned(true);
      alert("Item successfully marked as returned!");

    } catch (err) {
      console.error(err);
      alert("Failed to confirm item return.");
    } finally {
      setConfirmingReward(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUserId || !chatData) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      // 1. Add Message
      await addDoc(collection(db, 'messages'), {
        chatId,
        senderId: currentUserId,
        message: messageText,
        timestamp: serverTimestamp()
      });

      // 2. Trigger notification for the owner if the finder is sending
      // Only send notification if the sender is NOT the owner
      if (currentUserId !== chatData.ownerId) {
        await addDoc(collection(db, 'notifications'), {
          userId: chatData.ownerId,
          title: 'New Anonymous Message',
          message: messageText.length > 30 ? messageText.substring(0, 30) + '...' : messageText,
          type: 'chat',
          chatId: chatId,
          read: false,
          timestamp: serverTimestamp()
        });
      }

      scrollToBottom();
    } catch (err) {
      console.error('Error sending message:', err);
      alert('Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-ghost-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-ghost-900 p-6 text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-xl font-bold text-ghost-100 mb-2">Unavailable</h1>
        <p className="text-ghost-300">{error}</p>
        <button
          onClick={() => router.push('/')}
          className="mt-8 px-6 py-2 bg-ghost-800 text-white rounded-lg hover:bg-ghost-700 transition"
        >
          Go Back
        </button>
      </div>
    );
  }

  const isOwner = currentUserId === chatData?.ownerId;

  return (
    <div className="min-h-screen bg-ghost-800 flex flex-col items-center md:py-8 px-0 sm:px-6 lg:px-8">
      <div className="w-full max-w-2xl bg-white border-x md:border border-ghost-600/30 md:rounded-3xl flex flex-col h-screen md:h-[85vh] shadow-2xl relative overflow-hidden">

        {/* Header */}
        <div className="glass-panel p-4 flex items-center gap-4 sticky top-0 z-10 border-b border-ghost-700">
          <button 
            onClick={() => router.back()}
            className="p-2 rounded-full hover:bg-ghost-700 text-ghost-400 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="flex-1 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-600/30 flex items-center justify-center">
                 <ShieldCheck className="w-5 h-5 text-primary-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-ghost-100 leading-tight">{chatData?.itemName || 'Anonymous Chat'}</h2>
                <p className="text-xs text-ghost-400 font-medium">Identity Protected</p>
              </div>
            </div>
            {isOwner && (
              <span className="badge bg-primary-500/20 text-primary-300 px-3 py-1 font-semibold text-xs rounded-lg border border-primary-500/30">
                You are the Owner
              </span>
            )}
          </div>
        </div>

        {/* Action Banners */}
        {isOwner && !itemReturned && (
          <div className="bg-primary-50 px-4 py-3 flex items-center justify-between shadow-sm border-b border-primary-100">
            <p className="text-xs text-primary-700 font-medium">Have you safely received your item back?</p>
            <button 
              onClick={handleConfirmReturned}
              disabled={confirmingReward}
              className="bg-primary-600 hover:bg-primary-500 text-white text-xs px-3 py-1.5 rounded-lg font-medium transition disabled:opacity-50 flex items-center gap-1"
            >
              {confirmingReward ? (
                <div className="w-3 h-3 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
              ) : (
                <CheckCircle className="w-3 h-3" />
              )}
              {confirmingReward ? 'Processing...' : 'Confirm Returned'}
            </button>
          </div>
        )}
        
        {itemReturned && (
          <div className="bg-green-500/10 border-b border-green-500/20 px-4 py-3 flex items-center justify-center gap-2 shadow-inner">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <p className="text-xs font-semibold text-green-400">Item Successfully Returned & Rewarded</p>
          </div>
        )}

        {/* Message List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 relative bg-ghost-900/50">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-ghost-400 opacity-60">
              <MessageCircle className="w-12 h-12 mb-3" />
              <p className="text-sm">Say hello! Your identity is anonymous.</p>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isMe = msg.senderId === currentUserId;
                const isSystem = msg.senderId === 'system';
                
                if (isSystem) {
                  return (
                    <div key={msg.id || idx} className="flex justify-center my-2">
                       <span className="bg-ghost-800/80 text-ghost-300 text-[10px] px-3 py-1 rounded-full border border-ghost-700/50 shadow-sm text-center max-w-[80%]">
                         {msg.message}
                       </span>
                    </div>
                  );
                }

                return (
                <div key={msg.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${isMe
                    ? 'bg-primary-600 text-white rounded-br-sm shadow-lg shadow-primary-900/10'
                    : 'bg-ghost-700 text-ghost-100 rounded-bl-sm border border-ghost-600/30 shadow-sm'
                    }`}>
                    <p className="break-words leading-relaxed">{msg.message}</p>
                    <span className={`text-[10px] sm:text-xs mt-1 block opacity-60 ${isMe ? 'text-right' : 'text-left'}`}>
                      {msg.timestamp?.toDate()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 'Sending...'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="p-3 sm:p-4 bg-white border-t border-ghost-600/20">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-ghost-800 border border-ghost-600/30 text-ghost-100 text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all placeholder:text-ghost-400"
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="bg-primary-600 hover:bg-primary-500 text-ghost-200 p-3 rounded-xl transition duration-200 disabled:opacity-50 disabled:hover:bg-primary-600 flex-shrink-0 flex items-center justify-center shadow-lg shadow-primary-900/50"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
          <p className="text-center text-[10px] text-ghost-400 mt-2 font-medium">Messages are secured and confidential</p>
        </div>

      </div>
    </div>
  );
}
