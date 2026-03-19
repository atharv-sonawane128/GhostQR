'use client';

import { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { ShoppingBag, QrCode, Tag, Zap, Shield, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';

const products = [
  {
    id: 'sticker',
    name: 'QR Sticker Pack',
    description: 'Waterproof, UV-resistant stickers. Stick on anything.',
    price: 99,
    unit: 'Pack of 3',
    icon: Tag,
    features: ['Waterproof', 'UV Resistant', 'Strong Adhesive'],
    badge: 'Popular',
    badgeColor: 'bg-green-500/20 text-green-400',
  },
  {
    id: 'keychain',
    name: 'QR Keychain',
    description: 'Premium metal keychain with embedded QR code.',
    price: 249,
    unit: 'Per piece',
    icon: Zap,
    features: ['Metal Build', 'Scratch Resistant', 'Compact'],
    badge: 'Premium',
    badgeColor: 'bg-yellow-500/20 text-yellow-400',
  },
  {
    id: 'tag',
    name: 'Luggage Tag',
    description: 'Heavy-duty silicone luggage tag with QR code.',
    price: 149,
    unit: 'Per piece',
    icon: Shield,
    features: ['Silicone Build', 'Flexible', 'Durable'],
    badge: 'New',
    badgeColor: 'bg-blue-500/20 text-blue-400',
  },
];

export default function ShopPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [ordering, setOrdering] = useState(false);
  
  const [qrs, setQrs] = useState([]);
  const [loadingQrs, setLoadingQrs] = useState(true);

  // Modal State
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedQrId, setSelectedQrId] = useState('');

  useEffect(() => {
    if (!user) return;
    const qrQuery = query(collection(db, 'qrcodes'), where('ownerId', '==', user.uid));
    const unsub = onSnapshot(qrQuery, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setQrs(data);
      setLoadingQrs(false);
    }, (err) => {
      console.error(err);
      setLoadingQrs(false);
    });
    return () => unsub();
  }, [user]);

  const initiateOrder = (product) => {
    if (loadingQrs) return toast.loading('Loading profile data...', { id: 'qrLoad' });
    toast.dismiss('qrLoad');

    if (qrs.length === 0) {
      toast.error('Please generate QR first');
      router.push('/dashboard');
      return;
    }

    setSelectedProduct(product);
    setSelectedQrId('');
  };

  const handleConfirmOrder = async (e) => {
    e.preventDefault();
    if (!user || !selectedProduct) return;
    if (!selectedQrId) {
      return toast.error('Please select a QR code first.');
    }

    setOrdering(true);
    try {
      await addDoc(collection(db, 'orders'), {
        orderId: `${Date.now()}`,
        userId: user.uid,
        productType: selectedProduct.id,
        qrId: selectedQrId,
        status: 'pending',
        amount: selectedProduct.price,
        createdAt: serverTimestamp(),
      });
      toast.success(`Order placed for ${selectedProduct.name}! 🎉`);
      setSelectedProduct(null);
    } catch (err) {
      toast.error('Failed to place order. Try again.');
    } finally {
      setOrdering(false);
    }
  };

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="text-2xl font-bold text-ghost-100">Shop</h1>
        <p className="text-ghost-300 text-sm mt-1">Order physical QR code products to track your belongings</p>
      </div>

      {/* Hero Banner */}
      <div className="rounded-2xl p-8 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.3) 0%, rgba(168,85,247,0.15) 50%, rgba(59,130,246,0.1) 100%)' }}>
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, #a855f7 0%, transparent 50%)' }} />
        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-ghost-accent/20 border border-ghost-accent/30 text-ghost-accent-light text-xs font-medium mb-3">
            <Zap className="w-3 h-3" />
            GhostQR Shop
          </div>
          <h2 className="text-xl font-bold text-ghost-100 mb-2">Protect What Matters</h2>
          <p className="text-ghost-300 text-sm max-w-md">
            Our QR products are weatherproof, tamper-evident, and linked directly to your GhostQR account.
            Get notified instantly when someone scans yours.
          </p>
        </div>
      </div>

      {/* Products */}
      <div className="grid lg:grid-cols-3 gap-6">
        {products.map(product => {
          const Icon = product.icon;
          return (
            <div key={product.id} className="glass flex flex-col hover:border-ghost-accent/30 transition-all duration-200 group">
              <div className="p-6 flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-ghost-accent/20 flex items-center justify-center group-hover:bg-ghost-accent/30 transition-colors">
                    <Icon className="w-6 h-6 text-ghost-accent-light" />
                  </div>
                  <span className={`badge ${product.badgeColor}`}>{product.badge}</span>
                </div>

                <h3 className="font-bold text-ghost-100 text-base mb-1.5">{product.name}</h3>
                <p className="text-sm text-ghost-300 mb-4">{product.description}</p>

                <ul className="space-y-1.5 mb-4">
                  {product.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-xs text-ghost-300">
                      <Check className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-6 pt-0">
                <div className="flex items-end justify-between mb-4">
                  <div>
                    <p className="text-2xl font-bold text-ghost-100">₹{product.price}</p>
                    <p className="text-xs text-ghost-400">{product.unit}</p>
                  </div>
                </div>
                <button
                  onClick={() => initiateOrder(product)}
                  className="btn-ghost w-full py-2.5 text-sm flex items-center justify-center gap-2"
                >
                  <ShoppingBag className="w-4 h-4" />
                  Order Now
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Order Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="glass w-full max-w-md p-6 relative">
            <button 
              onClick={() => setSelectedProduct(null)}
              className="absolute top-4 right-4 text-ghost-400 hover:text-ghost-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-6">
              <h3 className="text-lg font-bold text-ghost-100">Link to active QR</h3>
              <p className="text-sm text-ghost-300 mt-1">Select the digital QR profile to print on your {selectedProduct.name}.</p>
            </div>

            <form onSubmit={handleConfirmOrder} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-ghost-300 mb-2 uppercase tracking-wider">
                  Select QR Code
                </label>
                <select 
                  required
                  value={selectedQrId} 
                  onChange={e => setSelectedQrId(e.target.value)} 
                  className="ghost-input appearance-none bg-ghost-800 w-full"
                >
                  <option value="" disabled>Select QR code for this product...</option>
                  {qrs.map(qr => (
                    <option key={qr.id} value={qr.id}>
                      {qr.itemName} (ID: {qr.id.substring(0,6)}) - {qr.status}
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-ghost-800/50 p-4 rounded-xl flex justify-between items-center border border-ghost-600/30">
                <span className="text-ghost-200 font-medium">Total Amount:</span>
                <span className="text-xl font-bold text-ghost-100">₹{selectedProduct.price}</span>
              </div>

              <button 
                type="submit" 
                disabled={ordering || !selectedQrId} 
                className="btn-ghost w-full py-3 text-sm flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {ordering ? 'Processing...' : 'Confirm Order'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="glass p-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-ghost-accent/20 flex items-center justify-center flex-shrink-0">
          <QrCode className="w-5 h-5 text-ghost-accent-light" />
        </div>
        <div>
          <p className="text-sm font-semibold text-ghost-100">How it works</p>
          <p className="text-xs text-ghost-400 mt-0.5">
            After ordering, your physical product will act exactly like the digital QR profile you linked it to.
            We'll print and ship your product within 3–5 business days. 
            Track orders in your Dashboard.
          </p>
        </div>
      </div>
    </div>
  );
}
