'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AlertCircle, User, FileText, MessageCircle, MapPin, Navigation } from 'lucide-react';
import { getDistance, formatDistance } from '@/lib/utils';

export default function ScanPage() {
  const { qrId } = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [qrData, setQrData] = useState(null);
  const [startingChat, setStartingChat] = useState(false);
  const [locationCaptured, setLocationCaptured] = useState(false);
  const [nearestDropzone, setNearestDropzone] = useState(null);
  const [finderLocation, setFinderLocation] = useState(null);

  const handleStartChat = async () => {
    if (!qrData || !qrId) return;
    setStartingChat(true);

    try {
      // 1. Get or create finder ID
      let finderId = localStorage.getItem('ghost_finder_id');
      if (!finderId) {
        finderId = 'finder_' + Math.random().toString(36).substring(2, 9);
        localStorage.setItem('ghost_finder_id', finderId);
      }

      // 2. Check if a chat already exists for this QR and finder
      const chatsRef = collection(db, 'chats');
      const q = query(chatsRef, where('qrId', '==', qrId), where('finderId', '==', finderId));
      const querySnapshot = await getDocs(q);

      let chatId;

      // 3. If exists, use it. If not, create it.
      if (!querySnapshot.empty) {
        chatId = querySnapshot.docs[0].id;
      } else {
        const newChatDoc = await addDoc(chatsRef, {
          qrId,
          itemName: qrData.itemName || 'Unknown Item',
          ownerId: qrData.ownerId,
          finderId,
          createdAt: serverTimestamp(),
        });
        chatId = newChatDoc.id;

        // Notify owner about the new chat initiation
        await addDoc(collection(db, 'notifications'), {
          userId: qrData.ownerId,
          title: 'Someone found your item!',
          message: `A finder has started an anonymous chat for your item: ${qrData.itemName}`,
          type: 'chat',
          chatId: chatId,
          read: false,
          timestamp: serverTimestamp()
        });
      }

      // 4. Redirect to the chat page
      router.push(`/chat/${chatId}`);
    } catch (err) {
      console.error('Error starting chat:', err);
      alert('Failed to start chat. Please try again.');
    } finally {
      setStartingChat(false);
    }
  };

  useEffect(() => {
    const fetchQRData = async () => {
      try {
        if (!qrId) return;

        const docRef = doc(db, 'qrcodes', qrId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.status !== 'active') {
            setError('This QR is not active.');
          } else {
            setQrData(data);
          }
        } else {
          setError('QR code not found.');
        }
      } catch (err) {
        console.error('Error fetching QR data:', err);
        setError('Failed to load item data.');
      } finally {
        setLoading(false);
      }
    };

    fetchQRData();
  }, [qrId]);

  useEffect(() => {
    if (!qrData || locationCaptured) return;

    const captureLocationAndNotify = async (position) => {
      const { latitude, longitude } = position.coords;
      setFinderLocation({ lat: latitude, lng: longitude });
      setLocationCaptured(true);

      try {
        let finderId = localStorage.getItem('ghost_finder_id');
        if (!finderId) {
          finderId = 'finder_' + Math.random().toString(36).substring(2, 9);
          localStorage.setItem('ghost_finder_id', finderId);
        }

        // 1. Log Scan
        await addDoc(collection(db, 'scans'), {
          qrId,
          finderId,
          latitude,
          longitude,
          timestamp: serverTimestamp()
        });

        // 2. Notify Owner
        const mapsLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
        await addDoc(collection(db, 'notifications'), {
          userId: qrData.ownerId,
          title: 'Your item was scanned!',
          message: `Your item "${qrData.itemName}" was scanned at this location.`,
          type: 'scan_location',
          mapsLink,
          qrId,
          latitude,
          longitude,
          read: false,
          timestamp: serverTimestamp()
        });

        // 3. Find Nearest Dropzone
        const dzSnap = await getDocs(collection(db, 'dropzones'));
        const dzs = dzSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        if (dzs.length > 0) {
          let closest = null;
          let minDistance = Infinity;

          dzs.forEach(dz => {
            const dist = getDistance(latitude, longitude, dz.lat, dz.lng);
            if (dist < minDistance) {
              minDistance = dist;
              closest = { ...dz, distance: dist };
            }
          });

          setNearestDropzone(closest);
        }

      } catch (err) {
        console.error('Error logging scan or notifying owner:', err);
      }
    };

    const handleDenied = async () => {
      setLocationCaptured(true); // Mark as tried
      // Still notify owner that item was scanned (but no location)
      try {
        await addDoc(collection(db, 'notifications'), {
          userId: qrData.ownerId,
          title: 'Your item was scanned',
          message: `Your item "${qrData.itemName}" was scanned, but the finder's location is unavailable.`,
          type: 'scan',
          qrId,
          read: false,
          timestamp: serverTimestamp()
        });
      } catch (err) {
        console.error('Error notifying owner:', err);
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(captureLocationAndNotify, handleDenied);
    } else {
      handleDenied();
    }
  }, [qrData, qrId, locationCaptured]);

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
        <h1 className="text-2xl font-bold text-white mb-2">Error</h1>
        <p className="text-ghost-300">{error}</p>
        <button
          onClick={() => router.push('/')}
          className="mt-8 px-6 py-2 bg-ghost-800 text-ghost-100 rounded-lg hover:bg-ghost-700 transition"
        >
          Go to Homepage
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ghost-900 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md bg-ghost-800/50 backdrop-blur-xl border border-ghost-700 rounded-3xl overflow-hidden shadow-2xl">

        <div className="bg-gradient-to-br from-primary-600 to-primary-800 px-6 py-10 text-center relative overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute top-0 left-0 w-32 h-32 bg-white opacity-5 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-24 h-24 bg-white opacity-5 rounded-full translate-x-1/3 translate-y-1/3"></div>

          <div className="flex justify-center mb-4 relative z-10">
            <div className="w-20 h-20 bg-ghost-900/40 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/10">
              <User className="w-10 h-10 text-white" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-ghost-100 mb-2 relative z-10">{qrData?.itemName || 'Unknown Item'}</h1>
          <p className="text-primary-100 font-medium relative z-10 flex items-center justify-center gap-1">
            You found someone's lost item <span role="img" aria-label="wave">👋</span>
          </p>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-ghost-900/50 rounded-xl p-4 border border-ghost-800">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-ghost-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-ghost-400 mb-1">Description</h3>
                <p className="text-ghost-100">{qrData?.description || 'No description provided.'}</p>
              </div>
            </div>
          </div>

          {qrData?.reward > 0 && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-green-400 mb-0.5">Reward Offered</h3>
                <p className="text-2xl font-bold text-green-300">₹{qrData.reward}</p>
              </div>
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                <span className="text-xl" role="img" aria-label="money">💰</span>
              </div>
            </div>
          )}

          {nearestDropzone && (
            <div className="bg-ghost-900/80 border border-primary-500/30 rounded-2xl p-4 relative overflow-hidden group hover:border-primary-500/50 transition-colors">
               <div className="absolute top-0 right-0 w-24 h-24 bg-primary-500/5 blur-2xl rounded-full -translate-y-12 translate-x-12"></div>
               <div className="flex items-start gap-4 relative z-10">
                 <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center shrink-0">
                   <Navigation className="w-5 h-5 text-primary-400" />
                 </div>
                 <div className="flex-1">
                   <div className="flex items-center justify-between mb-1">
                     <h3 className="text-xs font-bold text-primary-300 uppercase tracking-wider">Nearest Secure Dropzone</h3>
                     <span className="text-[10px] bg-primary-500/20 text-primary-300 px-2 py-0.5 rounded-full font-bold">
                       {formatDistance(nearestDropzone.distance)}
                     </span>
                   </div>
                   <p className="text-ghost-100 font-bold text-sm mb-1">{nearestDropzone.name}</p>
                   <p className="text-ghost-400 text-xs line-clamp-1">{nearestDropzone.address}</p>
                   <p className="text-[10px] text-ghost-500 mt-2 flex items-center gap-1 italic">
                     <Navigation className="w-2.5 h-2.5" /> Highly recommended for secure returns
                   </p>
                 </div>
               </div>
            </div>
          )}

          <div className="pt-4 border-t border-ghost-800">
            <p className="text-center text-ghost-400 text-sm mb-4">
              Help return it and claim your reward safely without sharing personal details.
            </p>

            <div className="grid gap-3">
              <button 
                onClick={handleStartChat}
                disabled={startingChat}
                className="w-full flex items-center justify-center gap-2 bg-ghost-400 hover:bg-ghost-500 text-ghost-100 py-3.5 px-4 rounded-xl font-medium transition duration-200 disabled:opacity-50"
              >
                {startingChat ? (
                  <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                ) : (
                  <MessageCircle className="w-5 h-5" />
                )}
                {startingChat ? 'Starting...' : 'Start Anonymous Chat'}
              </button>
              <button 
                onClick={() => router.push(`/dropzone/${qrId}`)}
                className="w-full flex items-center justify-center gap-2 bg-ghost-400 hover:bg-ghost-500 text-ghost-100 py-3.5 px-4 rounded-xl font-medium transition duration-200"
              >
                <MapPin className="w-5 h-5" />
                Submit to Dropzone
              </button>
            </div>
          </div>
        </div>

      </div>

      <div className="mt-8 text-center text-ghost-500 text-xs flex flex-col items-center">
        <p>Secured by GhostQR Platform</p>
        <p className="mt-1">Your identity remains completely anonymous.</p>
      </div>
    </div>
  );
}
