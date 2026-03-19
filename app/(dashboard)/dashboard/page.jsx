'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { QrCode, Map, Plus, Tag, ArrowRight, CheckCircle, Image as ImageIcon, X, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { getDistance, formatDistance } from '@/lib/utils';
import { Navigation } from 'lucide-react';

// Dynamically import the Leaflet map to avoid window undefined SSR errors
const DropzoneMap = dynamic(() => import('@/components/DropzoneMap'), { ssr: false, loading: () => <div className="w-full h-[400px] rounded-xl bg-ghost-700/30 animate-pulse" /> });

const statusBadge = (status) => {
  const map = { created: 'status-created', printed: 'status-printed', delivered: 'status-delivered' };
  return <span className={`badge ${map[status] || 'status-created'}`}>{status}</span>;
};

export default function DashboardPage() {
  const { user, userData } = useAuth();
  const [qrs, setQrs] = useState([]);
  const [dropzones, setDropzones] = useState([]);
  const [loadingQrs, setLoadingQrs] = useState(true);
  const [loadingDropzones, setLoadingDropzones] = useState(true);
  const [nearestDropzone, setNearestDropzone] = useState(null);
  const [ownerLocation, setOwnerLocation] = useState(null);

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [postSubmit, setPostSubmit] = useState(false);
  
  const [itemName, setItemName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [reward, setReward] = useState('');
  const [photo, setPhoto] = useState(null);

  useEffect(() => {
    if (!user) return;
    const qrQuery = query(collection(db, 'qrcodes'), where('ownerId', '==', user.uid));
    const unsubQr = onSnapshot(qrQuery, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sort client-side to avoid requiring a composite index in Firestore during dev
      data.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setQrs(data);
      setLoadingQrs(false);
    }, (err) => {
      console.error(err);
      setLoadingQrs(false);
    });
    return () => unsubQr();
  }, [user]);

  useEffect(() => {
    const fetchDropzones = async () => {
      try {
        const dzSnap = await getDocs(collection(db, 'dropzones'));
        setDropzones(dzSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error('Error fetching dropzones:', err);
      } finally {
        setLoadingDropzones(false);
      }
    };
    fetchDropzones();
  }, []);

  useEffect(() => {
    if (dropzones.length === 0 || nearestDropzone) return;

    const findNearest = (position) => {
      const { latitude, longitude } = position.coords;
      setOwnerLocation({ lat: latitude, lng: longitude });

      let closest = null;
      let minDistance = Infinity;

      dropzones.forEach(dz => {
        const dist = getDistance(latitude, longitude, dz.lat, dz.lng);
        if (dist < minDistance) {
          minDistance = dist;
          closest = { ...dz, distance: dist };
        }
      });

      setNearestDropzone(closest);
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(findNearest, (err) => console.log('Location denied'));
    }
  }, [dropzones, nearestDropzone]);

  const handleGenerateQR = async (e) => {
    e.preventDefault();
    if (!itemName || !category) return toast.error('Item name and category are required');
    
    setIsSubmitting(true);
    let photoUrl = null;

    try {
      // 1. Convert photo to Base64 data URI if it exists
      if (photo) {
        // Enforce rough 800KB limit to stay safely under Firestore 1MB doc limit
        if (photo.size > 800000) {
          toast.error('Image is too large. Please select an image under 800KB.');
          setIsSubmitting(false);
          return;
        }

        photoUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(photo);
          reader.onload = () => resolve(reader.result);
          reader.onerror = error => reject(error);
        });
      }

      // 2. Add QR document
      await addDoc(collection(db, 'qrcodes'), {
        ownerId: user.uid,
        itemName,
        description,
        category,
        reward: reward ? Number(reward) : 0,
        photoUrl,
        status: 'created',
        createdAt: serverTimestamp()
      });

      // 3. Show Post-Submit Success
      setPostSubmit(true);
      toast.success('QR Code Data Generated!');

    } catch (err) {
      toast.error('Failed to generate QR profile: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setPostSubmit(false);
    setItemName('');
    setDescription('');
    setCategory('');
    setReward('');
    setPhoto(null);
  };

  return (
    <div className="space-y-8 pb-10">
      {/* 1. Top Section - Welcome & Generate */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ghost-accent-light">
            Welcome back, {userData?.name?.split(' ')[0] || 'there'} 👻
          </h1>
          <p className="text-ghost-300 text-sm mt-1">Manage your virtual GhostQR tags and physical orders.</p>
        </div>
        {!showForm && !postSubmit && (
          <button 
            onClick={() => setShowForm(true)}
            className="btn-ghost px-5 py-2.5 text-sm inline-flex items-center gap-2 w-fit shadow-lg shadow-ghost-accent/20"
          >
            <Plus className="w-4 h-4" />
            Generate New QR
          </button>
        )}
      </div>

      {/* 2. QR Generation Area (Form or Success) */}
      {showForm && !postSubmit && (
        <div className="glass p-6 sm:p-8 animate-fade-in relative border border-ghost-accent/30 max-w-3xl">
          <button onClick={resetForm} className="absolute top-6 right-6 text-ghost-400 hover:text-ghost-300 transition-colors">
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-ghost-accent/20 flex items-center justify-center">
              <QrCode className="w-5 h-5 text-ghost-accent-light" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-ghost-100">New QR Profile</h2>
              <p className="text-xs text-ghost-400">Describe the item you want to protect</p>
            </div>
          </div>

          <form onSubmit={handleGenerateQR} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-ghost-300 mb-1.5 uppercase tracking-wider">Item Name <span className="text-red-400">*</span></label>
                <input required value={itemName} onChange={e=>setItemName(e.target.value)} className="ghost-input" placeholder="e.g. MacBook Pro M3" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ghost-300 mb-1.5 uppercase tracking-wider">Category <span className="text-red-400">*</span></label>
                <select required value={category} onChange={e=>setCategory(e.target.value)} className="ghost-input appearance-none bg-ghost-800">
                  <option value="" disabled>Select category...</option>
                  <option value="electronics">Electronics & Gadgets</option>
                  <option value="bag">Bag / Backpack</option>
                  <option value="wallet">Wallet / Keys</option>
                  <option value="vehicle">Vehicle / Bike</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ghost-300 mb-1.5 uppercase tracking-wider">Description</label>
              <textarea value={description} onChange={e=>setDescription(e.target.value)} className="ghost-input min-h-[80px]" placeholder="Identifying features, serial numbers, color..." />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
              <div>
                <label className="block text-xs font-semibold text-ghost-300 mb-1.5 uppercase tracking-wider">Bounty Reward (₹)</label>
                <input type="number" min="0" value={reward} onChange={e=>setReward(e.target.value)} className="ghost-input" placeholder="Reward for finding it (Optional)" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ghost-300 mb-1.5 uppercase tracking-wider">Photo</label>
                <label className="ghost-input flex items-center gap-2 cursor-pointer hover:border-ghost-accent transition-colors">
                  <ImageIcon className="w-4 h-4 text-ghost-400" />
                  <span className="text-sm truncate text-ghost-300">{photo ? photo.name : 'Upload item photo (Optional)'}</span>
                  <input type="file" accept="image/*" onChange={e=>setPhoto(e.target.files[0])} className="hidden" />
                </label>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button type="submit" disabled={isSubmitting} className="btn-ghost px-6 py-2.5 text-sm w-full md:w-auto flex items-center justify-center gap-2 disabled:opacity-60">
                {isSubmitting ? 'Generating...' : <><QrCode className="w-4 h-4" /> Save QR Profile</>}
              </button>
            </div>
          </form>
        </div>
      )}

      {postSubmit && (
        <div className="glass p-8 text-center animate-fade-in border border-green-500/30 bg-green-500/5 max-w-2xl mx-auto shadow-xl">
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-ghost-100 mb-2">Virtual Profile Created!</h2>
          <p className="text-ghost-300 text-sm mb-6 max-w-md mx-auto leading-relaxed">
            Your item description has been securely saved to the GhostQR network. 
            To activate protection, you need a physical QR code linked to this profile.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/shop" className="btn-ghost px-6 py-2.5 text-sm flex items-center gap-2 w-full sm:w-auto justify-center">
              <Tag className="w-4 h-4" /> Buy Ghost QR Sticker
            </Link>
            <button onClick={resetForm} className="px-6 py-2.5 text-sm text-ghost-300 hover:text-ghost-100 font-medium w-full sm:w-auto text-center transition-colors">
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
        {/* 3. List of Generated QRs */}
        <div className="xl:col-span-2 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <QrCode className="w-5 h-5 text-ghost-accent-light" />
            <h2 className="text-lg font-bold text-ghost-100">Your QR Profiles</h2>
          </div>
          
          <div className="grid gap-3">
            {loadingQrs ? (
              [1,2,3].map(i => <div key={i} className="glass h-20 animate-pulse" />)
            ) : qrs.length === 0 ? (
              <div className="glass p-10 text-center border-dashed">
                <AlertCircle className="w-8 h-8 text-ghost-500 mx-auto mb-3" />
                <p className="text-sm font-medium text-ghost-200">No active QR profiles</p>
                <p className="text-xs text-ghost-400 mt-1">Generate a profile above to secure your items.</p>
              </div>
            ) : (
              qrs.map(qr => (
                <div key={qr.id} className="glass p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-ghost-accent/30 transition-colors">
                  <div className="flex items-start gap-4 flex-1 overflow-hidden">
                    <div className="w-12 h-12 rounded-lg bg-ghost-800 flex items-center justify-center flex-shrink-0 border border-ghost-600/50">
                      {qr.photoUrl ? (
                        <div className="w-full h-full rounded-lg bg-cover bg-center" style={{ backgroundImage: `url(${qr.photoUrl})` }} />
                      ) : (
                        <Tag className="w-5 h-5 text-ghost-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-ghost-100 truncate text-sm sm:text-base">{qr.itemName}</p>
                        {statusBadge(qr.status)}
                      </div>
                      <p className="text-xs text-ghost-400 font-mono">ID: {qr.id}</p>
                    </div>
                  </div>
                  
                  {qr.status === 'created' ? (
                    <Link href="/shop" className="sm:w-auto w-full px-4 py-2 rounded-lg bg-ghost-accent/10 hover:bg-ghost-accent/20 text-ghost-accent-light text-xs font-semibold transition-colors flex items-center justify-center gap-2 flex-shrink-0 group">
                      Order Physical QR <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  ) : (
                    <div className="px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 text-xs font-semibold text-center mt-2 sm:mt-0">
                      Protected 
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* 4. Dropzone Map */}
        <div className="xl:col-span-1 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Map className="w-5 h-5 text-ghost-accent-light" />
            <h2 className="text-lg font-bold text-ghost-100">Ghost Dropzones</h2>
          </div>
          <div className="glass p-2 bg-ghost-800/50 h-[450px] flex flex-col">
            <p className="text-xs text-ghost-300 px-3 py-2 leading-relaxed mb-2 border-b border-ghost-600/30">
              Safe zones where our agents or finders can securely drop off your recovered belongings.
            </p>
            
            {nearestDropzone && (
              <div className="mx-2 mb-3 bg-primary-500/10 border border-primary-500/20 rounded-xl p-3 flex items-start gap-3 animate-fade-in">
                <div className="w-8 h-8 rounded-lg bg-primary-500/20 flex items-center justify-center shrink-0">
                  <Navigation className="w-4 h-4 text-primary-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="text-[10px] font-bold text-primary-300 uppercase tracking-wider">Nearest to You</h3>
                    <span className="text-[9px] bg-primary-500/20 text-primary-300 px-1.5 py-0.5 rounded-full font-bold">
                      {formatDistance(nearestDropzone.distance)}
                    </span>
                  </div>
                  <p className="text-ghost-100 font-bold text-xs">{nearestDropzone.name}</p>
                  <p className="text-ghost-400 text-[10px] line-clamp-1">{nearestDropzone.address}</p>
                </div>
              </div>
            )}

            <DropzoneMap dropzones={dropzones} />
          </div>
        </div>
      </div>
    </div>
  );
}
