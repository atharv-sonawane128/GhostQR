'use client';

import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { User, Mail, Coins, Shield, Edit2, Check, X, Gift, Tag, Ticket } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function ProfilePage() {
  const { user, userData } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(userData?.name || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Name cannot be empty'); return; }
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), { name: name.trim() });
      toast.success('Profile updated!');
      setEditing(false);
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const initials = (userData?.name || user?.email || 'U')
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-ghost-100">Profile</h1>
        <p className="text-ghost-300 text-sm mt-1">Manage your GhostQR account</p>
      </div>

      {/* Avatar Card */}
      <div className="glass p-8 text-center">
        <div className="relative inline-block mb-4">
          <div className="w-24 h-24 rounded-2xl flex items-center justify-center text-3xl font-bold text-white mx-auto shadow-2xl"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}>
            {initials}
          </div>
          <div className={clsx(
            'absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-ghost-800 flex items-center justify-center text-xs',
            userData?.role === 'admin' ? 'bg-yellow-500' : 'bg-green-500'
          )}>
            {userData?.role === 'admin' ? '👑' : '✓'}
          </div>
        </div>
        <h2 className="text-xl font-bold text-ghost-100">{userData?.name || 'Anonymous'}</h2>
        <p className="text-ghost-400 text-sm mt-1">{user?.email}</p>
        <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full border border-ghost-accent/30 bg-ghost-accent/10 text-ghost-accent-light text-xs font-medium">
          <Shield className="w-3 h-3" />
          {userData?.role === 'admin' ? 'Administrator' : 'Member'}
        </div>
      </div>

      {/* Details */}
      <div className="glass divide-y divide-ghost-600/30 overflow-hidden">
        {/* Name field */}
        <div className="p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-ghost-accent/20 flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5 text-ghost-accent-light" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-ghost-400 uppercase tracking-wider mb-1">Display Name</p>
            {editing ? (
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className="ghost-input text-sm py-1.5"
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
              />
            ) : (
              <p className="text-sm font-medium text-ghost-100">{userData?.name || '—'}</p>
            )}
          </div>
          {editing ? (
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center text-green-400 hover:bg-green-500/30 transition-colors"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => { setEditing(false); setName(userData?.name || ''); }}
                className="w-8 h-8 rounded-lg bg-ghost-700/40 flex items-center justify-center text-ghost-400 hover:text-ghost-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="w-8 h-8 rounded-lg bg-ghost-700/40 flex items-center justify-center text-ghost-400 hover:text-ghost-200 transition-colors flex-shrink-0"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Email */}
        <div className="p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-ghost-accent/20 flex items-center justify-center flex-shrink-0">
            <Mail className="w-5 h-5 text-ghost-accent-light" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-ghost-400 uppercase tracking-wider mb-1">Email</p>
            <p className="text-sm font-medium text-ghost-100">{user?.email}</p>
          </div>
        </div>

        {/* GhostCoins */}
        <div className="p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
            <Coins className="w-5 h-5 text-yellow-400" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-ghost-400 uppercase tracking-wider mb-1">GhostCoins</p>
            <div className="flex items-center gap-2">
              <p className="text-lg font-bold text-yellow-400">{userData?.ghostCoins ?? 0}</p>
              <span className="text-ghost-400 text-xs">🪙</span>
            </div>
          </div>
        </div>

        {/* Role */}
        <div className="p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-ghost-accent/20 flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-ghost-accent-light" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-ghost-400 uppercase tracking-wider mb-1">Account Role</p>
            <p className="text-sm font-medium text-ghost-100 capitalize">{userData?.role || 'user'}</p>
          </div>
        </div>
      </div>

      {/* Ghost Coins Logic Info */}
      <div className="glass p-6 border-l-4 border-yellow-500/50 bg-yellow-500/5">
        <h3 className="text-sm font-bold text-ghost-100 mb-2 flex items-center gap-2">
          <Coins className="w-4 h-4 text-yellow-400" /> How GhostCoins Work
        </h3>
        <p className="text-xs text-ghost-300 leading-relaxed mb-3">
          GhostCoins are our platform's virtual currency used to reward honest finders. 
          When a finder returns an item, they receive the full reward amount, split automatically:
        </p>
        <div className="bg-ghost-900/50 p-3 rounded-lg border border-ghost-700/50 text-xs text-ghost-400 font-mono">
          <span className="text-ghost-100">Example Reward:</span> ₹1,000<br/>
          <span className="text-green-400">Finder Receives (Real Money):</span> ₹900 (90%)<br/>
          <span className="text-yellow-400">Finder Receives (GhostCoins):</span> 100 🪙 (10%)
        </div>
      </div>

      {/* Redeem Ghost Coins */}
      <div>
        <h3 className="text-lg font-bold text-ghost-100 mb-4">Redeem GhostCoins</h3>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="glass p-5 hover:border-ghost-accent/30 transition-colors cursor-pointer group text-center">
            <div className="w-10 h-10 mx-auto rounded-xl bg-purple-500/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Gift className="w-5 h-5 text-purple-400" />
            </div>
            <p className="font-semibold text-ghost-100 text-sm">Gift Cards</p>
            <p className="text-xs text-ghost-400 mt-1">Amazon, Flipkart & more</p>
            <p className="text-xs font-bold text-yellow-400 mt-3 flex items-center justify-center gap-1">500 🪙 Minimum</p>
          </div>

          <div className="glass p-5 hover:border-ghost-accent/30 transition-colors cursor-pointer group text-center">
            <div className="w-10 h-10 mx-auto rounded-xl bg-green-500/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Tag className="w-5 h-5 text-green-400" />
            </div>
            <p className="font-semibold text-ghost-100 text-sm">Free QR Stickers</p>
            <p className="text-xs text-ghost-400 mt-1">Get free physical tags</p>
            <p className="text-xs font-bold text-yellow-400 mt-3 flex items-center justify-center gap-1">200 🪙 Each</p>
          </div>

          <div className="glass p-5 hover:border-ghost-accent/30 transition-colors cursor-pointer group text-center">
            <div className="w-10 h-10 mx-auto rounded-xl bg-blue-500/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Ticket className="w-5 h-5 text-blue-400" />
            </div>
            <p className="font-semibold text-ghost-100 text-sm">Discount Coupons</p>
            <p className="text-xs text-ghost-400 mt-1">For our partner stores</p>
            <p className="text-xs font-bold text-yellow-400 mt-3 flex items-center justify-center gap-1">100 🪙 Upwards</p>
          </div>
        </div>
      </div>

      {/* UID */}
      <div className="glass p-5 mt-8">
        <p className="text-xs text-ghost-400 uppercase tracking-wider mb-2">User ID</p>
        <p className="text-xs text-ghost-500 font-mono break-all">{user?.uid}</p>
      </div>
    </div>
  );
}
