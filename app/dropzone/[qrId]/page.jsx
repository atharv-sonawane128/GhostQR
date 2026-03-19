'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { collection, getDocs, doc, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { MapPin, ArrowLeft, Loader2, CheckCircle2, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';
import { getDistance } from '@/lib/utils';

// Dynamically import map without SSR to prevent window/navigator undefined errors
const DropzoneMap = dynamic(() => import('@/components/DropzoneMap'), { ssr: false });

export default function DropzonePage() {
  const { qrId } = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [dropzones, setDropzones] = useState([]);
  const [qrData, setQrData] = useState(null);

  const [submittingId, setSubmittingId] = useState(null);
  const [successOTP, setSuccessOTP] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [nearestId, setNearestId] = useState(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        if (!qrId) return;

        // Fetch QR details to get ownerId
        const qrRef = doc(db, 'qrcodes', qrId);
        const qrSnap = await getDoc(qrRef);
        if (qrSnap.exists() && qrSnap.data().status === 'active') {
          setQrData(qrSnap.data());
        }

        // Fetch Dropzones
        const dzSnap = await getDocs(collection(db, 'dropzones'));
        setDropzones(dzSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, [qrId]);

  useEffect(() => {
    if (dropzones.length === 0 || userLocation) return;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });

        let closestId = null;
        let minDistance = Infinity;

        dropzones.forEach(dz => {
          const dist = getDistance(latitude, longitude, dz.lat, dz.lng);
          if (dist < minDistance) {
            minDistance = dist;
            closestId = dz.id;
          }
        });
        setNearestId(closestId);
      });
    }
  }, [dropzones, userLocation]);

  const handleSelectDropzone = async (dropzoneId) => {
    if (!qrId || !qrData) return;
    setSubmittingId(dropzoneId);

    try {
      // 1. Get/verify finder ID
      let finderId = localStorage.getItem('ghost_finder_id');
      if (!finderId) {
        finderId = 'finder_' + Math.random().toString(36).substring(2, 9);
        localStorage.setItem('ghost_finder_id', finderId);
      }

      // 2. Generate random 6 character OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // 3. Create drop submission document
      await addDoc(collection(db, 'dropSubmissions'), {
        qrId,
        itemName: qrData.itemName || 'Unnamed Item',
        ownerId: qrData.ownerId,
        finderId,
        dropzoneId,
        status: 'pending',
        otp,
        createdAt: serverTimestamp()
      });

      // 4. Send notification to owner
      await addDoc(collection(db, 'notifications'), {
        userId: qrData.ownerId,
        title: 'Item Submitted to Dropzone',
        message: 'Your item has been submitted to a dropzone. Check the app for location and picking instructions.',
        type: 'dropzone',
        read: false,
        timestamp: serverTimestamp()
      });

      // 5. Show success screen
      setSuccessOTP(otp);

    } catch (err) {
      console.error('Error submitting to dropzone:', err);
      alert('Failed to submit item. Please try again.');
    } finally {
      setSubmittingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-ghost-900">
        <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (successOTP) {
    return (
      <div className="min-h-screen bg-ghost-900 flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-ghost-800 border border-ghost-700 rounded-3xl p-8 shadow-2xl">
          <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-ghost-100 mb-2">Item Submitted!</h1>
          <p className="text-ghost-300 text-sm mb-6">
            Hand over your item to the Zone Manager and tell them this OTP to verify the drop-off.
          </p>

          <div className="bg-ghost-900 border border-ghost-700 rounded-xl p-6 mb-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/5 blur-2xl rounded-full translate-x-12 -translate-y-12"></div>
            <p className="text-xs text-ghost-400 font-medium uppercase tracking-wider mb-3">Submission OTP</p>
            <div className="flex items-center justify-center gap-4">
              <p className="text-5xl font-mono font-bold text-primary-400 tracking-[0.2em]">{successOTP}</p>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(successOTP);
                  toast.success('OTP Copied!');
                }}
                className="p-2 rounded-lg bg-ghost-800 text-ghost-400 hover:text-primary-400 hover:bg-ghost-700 transition-all active:scale-95"
                title="Copy OTP"
              >
                <Copy className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="space-y-3">
             <div className="flex items-start gap-3 p-4 bg-primary-500/5 border border-primary-500/10 rounded-xl text-left">
                <div className="w-5 h-5 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold">1</div>
                <p className="text-xs text-ghost-300 leading-relaxed">Give the item and the OTP above to the manager at the dropzone.</p>
             </div>
             <div className="flex items-start gap-3 p-4 bg-primary-500/5 border border-primary-500/10 rounded-xl text-left">
                <div className="w-5 h-5 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold">2</div>
                <p className="text-xs text-ghost-300 leading-relaxed">The owner will be notified automatically once the manager receives the item.</p>
             </div>
          </div>

          <button
            onClick={() => router.push('/')}
            className="w-full mt-8 bg-primary-600 hover:bg-primary-500 text-white rounded-xl py-4 font-bold tracking-wide shadow-lg shadow-primary-900/40 transition-all active:scale-[0.98]"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ghost-900 flex flex-col md:py-8 px-0 sm:px-6 lg:px-8">
      <div className="w-full max-w-4xl mx-auto flex flex-col h-screen md:h-[85vh] relative text-ghost-100">

        {/* Header */}
        <div className="p-4 flex items-center gap-4 bg-ghost-900 md:bg-transparent">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-full bg-ghost-800 hover:bg-ghost-700 transition"
          >
            <ArrowLeft className="w-5 h-5 text-ghost-300" />
          </button>
          <div>
            <h1 className="text-xl font-bold">Select Dropzone</h1>
            <p className="text-xs text-ghost-400">Choose a location to leave the {qrData?.itemName || 'item'}</p>
          </div>
        </div>

        {/* Map Container */}
        <div className="flex-1 p-0 md:p-4 pb-4 overflow-hidden relative">
          <DropzoneMap
            dropzones={dropzones}
            onSelectDropzone={handleSelectDropzone}
            submittingId={submittingId}
            userLocation={userLocation}
          />
        </div>

      </div>
    </div>
  );
}
