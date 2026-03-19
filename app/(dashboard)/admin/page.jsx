'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query, updateDoc, doc, addDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import {
  Shield, Users, QrCode, ShoppingBag, AlertTriangle,
  CheckCircle, Clock, RefreshCw, Download, MapPin, Plus, Trash2, Search, FileText,
  PackageCheck, Key, ShieldCheck
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import { jsPDF } from 'jspdf';


const statusBadge = (status, collection = 'qr') => {
  const map = {
    created:   'status-created',
    printed:   'status-printed',
    delivered: 'status-delivered',
    pending:   'status-pending',
    ready:     'status-ready',
    user:      'bg-ghost-500/30 text-ghost-200',
    admin:     'bg-yellow-500/20 text-yellow-400',
  };
  return <span className={`badge ${map[status] || 'status-created'}`}>{status}</span>;
};

export default function AdminPage() {
  const { user, userData } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [qrs, setQrs] = useState([]);
  const [orders, setOrders] = useState([]);
  const [dropzones, setDropzones] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Dropzone Form State
  const [newDzName, setNewDzName] = useState('');
  const [newDzLat, setNewDzLat] = useState('');
  const [newDzLng, setNewDzLng] = useState('');
  const [newDzAddress, setNewDzAddress] = useState('');
  const [submittingDz, setSubmittingDz] = useState(false);
  const [fetchingCoords, setFetchingCoords] = useState(false);

  useEffect(() => {
    if (!userData) return;
    if (userData.role !== 'admin') {
      router.replace('/dashboard');
      return;
    }

    const unsubUsers = onSnapshot(query(collection(db, 'users')), snap => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    const unsubQrs = onSnapshot(
      query(collection(db, 'qrcodes'), orderBy('createdAt', 'desc')),
      snap => setQrs(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    const unsubOrders = onSnapshot(
      query(collection(db, 'orders')),
      snap => setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    const unsubDropzones = onSnapshot(
      query(collection(db, 'dropzones')),
      snap => setDropzones(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    const unsubSubmissions = onSnapshot(
      query(collection(db, 'dropSubmissions')),
      snap => {
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        // Client-side sort to support both old and new field names efficiently
        docs.sort((a, b) => (b.createdAt?.toMillis() || b.timestamp?.toMillis() || 0) - (a.createdAt?.toMillis() || a.timestamp?.toMillis() || 0));
        setSubmissions(docs);
      }
    );

    return () => { 
      unsubUsers(); unsubQrs(); unsubOrders(); unsubDropzones(); unsubSubmissions(); 
    };
  }, [userData, router]);

  const updateQrStatus = async (id, ownerId, itemName, status) => {
    try {
      await updateDoc(doc(db, 'qrcodes', id), { status });
      
      if (ownerId) {
        let displayStatus = status;
        if (status === 'printed') displayStatus = 'ready';
        
        await addDoc(collection(db, 'notifications'), {
          userId: ownerId,
          title: 'Product Status Updated',
          message: `Your product for ${itemName || 'item'} is now ${displayStatus}.`,
          type: 'qr',
          read: false,
          timestamp: serverTimestamp()
        });
      }
      
      toast.success(`QR status → ${status}`);
    } catch (err) {
      console.error(err);
      toast.error('Update failed');
    }
  };

  const updateOrderStatus = async (orderId, userId, productType, status, qrId) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status });
      
      // Auto-activate QR code if order is delivered
      if (status === 'delivered' && qrId) {
        await updateDoc(doc(db, 'qrcodes', qrId), { status: 'active' });
        toast.success(`QR Profile ${qrId.slice(0, 6)} activated!`);
      }

      if (userId) {
        await addDoc(collection(db, 'notifications'), {
          userId,
          title: 'Order Status Updated',
          message: `Your order for ${productType || 'item'} is now ${status}.${status === 'delivered' ? ' Your GhostQR is now ACTIVE!' : ''}`,
          type: 'order',
          read: false,
          timestamp: serverTimestamp()
        });
      }
      toast.success(`Order status → ${status}`);
    } catch (err) {
      console.error(err);
      toast.error('Update failed');
    }
  };

  const fetchCoordinates = async () => {
    if (!newDzName) return toast.error('Enter a location name first');
    setFetchingCoords(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(newDzName)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        setNewDzLat(data[0].lat);
        setNewDzLng(data[0].lon);
        if (!newDzAddress) setNewDzAddress(data[0].display_name);
        toast.success('Coordinates found!');
      } else {
        toast.error('Location not found. Please enter manually.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch coordinates');
    } finally {
      setFetchingCoords(false);
    }
  };

  const handleAddDropzone = async (e) => {
    e.preventDefault();
    if (!newDzName || !newDzLat || !newDzLng) return toast.error('Name, Lat, and Lng are required');
    setSubmittingDz(true);
    try {
      await addDoc(collection(db, 'dropzones'), {
        name: newDzName,
        lat: parseFloat(newDzLat),
        lng: parseFloat(newDzLng),
        address: newDzAddress,
        createdAt: serverTimestamp()
      });
      toast.success('Dropzone added successfully!');
      setNewDzName('');
      setNewDzLat('');
      setNewDzLng('');
      setNewDzAddress('');
    } finally {
      setSubmittingDz(false);
    }
  };

  const handleReceiveItem = async (submission) => {
    const enteredOtp = window.prompt(`Enter Finder's OTP for ${submission.itemName}:`);
    if (!enteredOtp) return;

    if (enteredOtp !== submission.otp) {
      return toast.error("Invalid OTP! Item cannot be received.");
    }

    try {
      // 1. Generate new OTP for Owner
      const ownerOtp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // 2. Update submission status
      await updateDoc(doc(db, 'dropSubmissions', submission.id), {
        status: 'received',
        ownerOtp: ownerOtp,
        receivedAt: serverTimestamp()
      });

      // 3. Find dropzone name for notification
      const dz = dropzones.find(d => d.id === submission.dropzoneId);
      const zoneName = dz?.name || 'the dropzone';

      // 4. Notify Owner
      await addDoc(collection(db, 'notifications'), {
        userId: submission.ownerId,
        title: 'Item Received at Dropzone!',
        message: `Your item "${submission.itemName}" has been safely received at ${zoneName}. You can collect it using OTP: ${ownerOtp}`,
        type: 'dropzone',
        read: false,
        timestamp: serverTimestamp()
      });

      toast.success("Item received! Owner has been notified.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to receive item.");
    }
  };

  const handleCompleteReturn = async (submission) => {
    const enteredOtp = window.prompt(`Enter Owner's OTP to release ${submission.itemName}:`);
    if (!enteredOtp) return;

    if (enteredOtp !== submission.ownerOtp) {
      return toast.error("Invalid OTP! Item cannot be released.");
    }

    try {
      // 1. Update submission status to 'returned'
      await updateDoc(doc(db, 'dropSubmissions', submission.id), {
        status: 'returned',
        returnedAt: serverTimestamp()
      });

      // 2. Reactivate the QR code
      if (submission.qrId) {
        await updateDoc(doc(db, 'qrcodes', submission.qrId), {
          status: 'active'
        });
      }

      // 3. Notify Owner of success
      await addDoc(collection(db, 'notifications'), {
        userId: submission.ownerId,
        title: 'Item Recovered!',
        message: `Your item "${submission.itemName}" has been successfully returned to you. Your GhostQR is now ACTIVE!`,
        type: 'qr',
        read: false,
        timestamp: serverTimestamp()
      });

      toast.success("Item returned successfully! QR Reactivated.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to complete return.");
    }
  };

  const deleteDropzone = async (id) => {
    if (!window.confirm('Are you sure you want to delete this dropzone?')) return;
    try {
      await deleteDoc(doc(db, 'dropzones', id));
      toast.success('Dropzone deleted');
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Failed to delete dropzone');
    }
  };

  const sanitizeFilePart = (value) =>
    (value || 'qr-code')
      .trim()
      .replace(/[^a-zA-Z0-9-_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

  const downloadQR = (qrId, itemName) => {
    const svg = document.getElementById(`qr-svg-${qrId}`);
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const svgMarkup = svgData.includes('xmlns="http://www.w3.org/2000/svg"')
      ? svgData
      : svgData.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    const fileName = `GhostQR-${sanitizeFilePart(itemName)}-${qrId.slice(0, 6)}.svg`;
    const blob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = fileName;
    link.click();

    URL.revokeObjectURL(url);
  };

  const downloadOrderBill = (order) => {
    const orderUser = users.find(u => u.id === order.userId);
    const doc = new jsPDF();

    // Header
    doc.setFontSize(22);
    doc.setTextColor(124, 58, 237); // Ghost purple
    doc.text("GHOST QR - INVOICE", 105, 20, { align: "center" });

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, 28, { align: "center" });

    // Divider
    doc.setDrawColor(200);
    doc.line(20, 35, 190, 35);

    // Bill Details
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text("Order Details", 20, 45);

    doc.setFont("helvetica", "normal");
    doc.text(`Order ID: #${order.id.slice(0, 10)}`, 20, 55);
    doc.text(`Tracking ID: ${order.orderId || 'N/A'}`, 20, 62);
    doc.text(`Status: ${order.status.toUpperCase()}`, 20, 69);
    doc.text(`Date: ${order.createdAt?.toDate().toLocaleDateString() || 'N/A'}`, 20, 76);

    // Customer Details
    doc.setFont("helvetica", "bold");
    doc.text("Customer Info", 120, 45);
    doc.setFont("helvetica", "normal");
    doc.text(`Name: ${orderUser?.name || 'Ghost User'}`, 120, 55);
    doc.text(`Email: ${orderUser?.email || 'N/A'}`, 120, 62);

    // Table Header
    doc.setFillColor(240, 240, 240);
    doc.rect(20, 90, 170, 10, 'F');
    doc.setFont("helvetica", "bold");
    doc.text("Product", 25, 96);
    doc.text("QR Link ID", 80, 96);
    doc.text("Price", 170, 96, { align: "right" });

    // Table Row
    doc.setFont("helvetica", "normal");
    doc.text(order.productType || 'QR Product', 25, 108);
    doc.text(order.qrId || 'N/A', 80, 108);
    doc.text(`INR ${order.amount || 0}.00`, 170, 108, { align: "right" });

    // Footer divider
    doc.line(20, 120, 190, 120);
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Total Amount:", 130, 130);
    doc.text(`INR ${order.amount || 0}.00`, 190, 130, { align: "right" });

    // Ghost Footer
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text("Thank you for choosing GhostQR. Protecting your belongings, invisibly.", 105, 280, { align: "center" });

    doc.save(`GhostQR-Invoice-${order.id.slice(0, 8)}.pdf`);
  };



  if (!userData) return null;
  if (userData.role !== 'admin') return null;

  const tabs = [
    { id: 'users', label: 'Users', icon: Users, count: users.length },
    { id: 'qrcodes', label: 'QR Codes', icon: QrCode, count: qrs.length },
    { id: 'orders', label: 'Orders', icon: ShoppingBag, count: orders.length },
    { id: 'dropsubmissions', label: 'Drop Items', icon: PackageCheck, count: submissions.filter(s => s.status === 'pending').length },
    { id: 'dropzones', label: 'Dropzones', icon: MapPin, count: dropzones.length },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
          <Shield className="w-5 h-5 text-yellow-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-ghost-100">Admin Panel</h1>
          <p className="text-ghost-300 text-sm">Manage users, QR codes, and orders</p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Users', value: users.length, icon: Users, color: 'text-primary-500 bg-primary-50', border: 'border-primary-100' },
          { label: 'QR Codes', value: qrs.length, icon: QrCode, color: 'text-ghost-accent-light bg-ghost-700', border: 'border-ghost-600/30' },
          { label: 'Pending Orders', value: orders.filter(o => o.status !== 'delivered').length, icon: ShoppingBag, color: 'text-gold-500 bg-orange-50', border: 'border-orange-100' },
        ].map(s => (
          <div key={s.label} className={clsx("stat-card p-6 flex items-center gap-5 border", s.border)}>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${s.color}`}>
              <s.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-ghost-100">{s.value}</p>
              <p className="text-xs font-bold text-ghost-300 uppercase tracking-widest">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-ghost-800 border border-ghost-600/20 rounded-2xl w-fit shadow-sm">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={clsx(
              'flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300',
              tab === t.id
                ? 'bg-ghost-accent text-white shadow-lg shadow-ghost-accent/30 scale-[1.02]'
                : 'text-ghost-300 hover:text-ghost-100 hover:bg-white'
            )}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
            <span className={clsx(
              'text-[10px] px-2 py-0.5 rounded-full font-black',
              tab === t.id ? 'bg-white/30 text-white' : 'bg-ghost-700 text-ghost-200'
            )}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="glass overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-12 bg-ghost-700/40 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* Users Table */}
            {tab === 'users' && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-ghost-800/50 border-b border-ghost-600/20">
                      <th className="px-6 py-4 text-left text-xs font-bold text-ghost-200 uppercase tracking-widest">User Info</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-ghost-200 uppercase tracking-widest">Contact</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-ghost-200 uppercase tracking-widest">Role</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-ghost-200 uppercase tracking-widest">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ghost-600/10">
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-ghost-700/20 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-ghost-accent/20 flex items-center justify-center text-xs font-bold text-ghost-accent-light">
                              {u.name?.[0]?.toUpperCase() || 'U'}
                            </div>
                            <span className="font-medium text-ghost-100">{u.name || 'Anonymous'}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-ghost-400 text-xs hidden sm:table-cell">{u.email}</td>
                        <td className="px-5 py-4">{statusBadge(u.role || 'user')}</td>
                        <td className="px-5 py-4 text-right text-yellow-400 font-medium hidden md:table-cell">{u.ghostCoins ?? 0} 🪙</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* QR Codes Table */}
            {tab === 'qrcodes' && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-ghost-800/50 border-b border-ghost-600/20">
                      <th className="px-6 py-4 text-left text-xs font-bold text-ghost-200 uppercase tracking-widest">Item Info</th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-ghost-200 uppercase tracking-widest">Status</th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-ghost-200 uppercase tracking-widest">Reward</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-ghost-200 uppercase tracking-widest">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ghost-600/10">
                    {qrs.map(qr => (
                      <tr key={qr.id} className="hover:bg-ghost-700/20 transition-colors">
                        <td className="px-5 py-4">
                          <p className="font-medium text-ghost-100">{qr.itemName}</p>
                          <p className="text-xs text-ghost-500 font-mono">{qr.id.slice(0, 10)}…</p>
                        </td>
                        <td className="px-5 py-4 text-center">{statusBadge(qr.status)}</td>
                        <td className="px-5 py-4 text-center text-gold-400 font-medium">{qr.reward || 0} 🪙</td>
                        <td className="px-5 py-4 flex items-center justify-end gap-3">

                          <button
                            onClick={() => downloadQR(qr.id, qr.itemName)}
                            className="inline-flex items-center gap-2 rounded-lg bg-ghost-700/40 px-3 py-1.5 text-xs font-medium text-ghost-300 hover:bg-ghost-600/50 hover:text-ghost-100 transition-colors"
                            title="Download QR SVG"
                            aria-label={`Download ${qr.itemName} as SVG`}
                          >
                            <Download className="w-4 h-4" />
                            <span>SVG</span>
                          </button>
                          <div className="hidden">
                             <QRCodeSVG id={`qr-svg-${qr.id}`} value={`https://ghost-qr.vercel.app/scan/${qr.id}`} size={300} level="H" />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Orders Table */}
            {tab === 'orders' && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-ghost-800/50 border-b border-ghost-600/20">
                      <th className="px-6 py-4 text-left text-xs font-bold text-ghost-200 uppercase tracking-widest">Order Details</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-ghost-200 uppercase tracking-widest">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-ghost-200 uppercase tracking-widest">Amount</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-ghost-200 uppercase tracking-widest">Invoice</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ghost-600/10">
                    {orders.map(order => (
                      <tr key={order.id} className="hover:bg-ghost-700/20 transition-colors">
                        <td className="px-5 py-4">
                          <p className="font-medium text-ghost-100">{order.productType}</p>
                          <p className="text-xs text-ghost-500 font-mono">ID: #{order.id.slice(0, 10)}</p>
                        </td>
                        <td className="px-5 py-4">{statusBadge(order.status)}</td>
                        <td className="px-5 py-4 text-ghost-200 font-medium">INR {order.amount || 0}.00</td>
                        <td className="px-5 py-4 flex items-center justify-end gap-3">
                          <select
                            value={order.status}
                            onChange={e => updateOrderStatus(order.id, order.userId, order.productType, e.target.value, order.qrId)}
                            className="text-xs bg-ghost-700/80 border border-ghost-600/40 rounded-lg px-2 py-1.5 text-ghost-200 cursor-pointer"
                          >
                            <option value="pending">pending</option>
                            <option value="ready">ready</option>
                            <option value="delivered">delivered</option>
                          </select>

                          <button
                            onClick={() => downloadOrderBill(order)}
                            className="p-2 rounded-lg bg-ghost-700/40 text-ghost-300 hover:bg-ghost-600/50 hover:text-ghost-accent-light transition-all group"
                            title="Download Bill PDF"
                          >
                            <FileText className="w-4 h-4 group-hover:scale-110 transition-transform" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Dropzones Table & Form */}
            {tab === 'dropzones' && (
              <div className="p-6">
                <div className="flex flex-col lg:flex-row gap-8">
                  {/* List */}
                  <div className="flex-1 space-y-4">
                    <h3 className="text-lg font-bold text-ghost-100 mb-4">Active Dropzones</h3>
                    {dropzones.length === 0 ? (
                      <p className="text-sm text-ghost-400">No dropzones configured yet.</p>
                    ) : (
                      <div className="grid gap-3">
                        {dropzones.map(dz => (
                          <div key={dz.id} className="glass p-4 flex items-center gap-4 bg-white/50">
                            <div className="w-10 h-10 rounded-xl bg-ghost-700 flex items-center justify-center flex-shrink-0 shadow-sm">
                              <MapPin className="w-5 h-5 text-ghost-200" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-ghost-100 truncate">{dz.name}</p>
                              <p className="text-xs text-ghost-400 truncate">{dz.address || 'No address provided'}</p>
                              <p className="text-[10px] text-ghost-500 font-mono mt-0.5">{dz.lat}, {dz.lng}</p>
                            </div>
                            <button
                              onClick={() => deleteDropzone(dz.id)}
                              className="p-2 text-ghost-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                              title="Delete dropzone"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Add Form */}
                  <div className="w-full lg:w-80 flex-shrink-0">
                    <div className="glass p-5">
                      <h3 className="text-sm font-bold text-ghost-100 mb-4 flex items-center gap-2">
                        <Plus className="w-4 h-4 text-ghost-accent-light" />
                        Add New Dropzone
                      </h3>
                      <form onSubmit={handleAddDropzone} className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-semibold text-ghost-300 mb-1 uppercase tracking-wider">Location Keywords</label>
                          <div className="flex gap-2">
                            <input required value={newDzName} onChange={e=>setNewDzName(e.target.value)} className="ghost-input py-2 text-sm flex-1" placeholder="e.g. SRM University, Chennai" />
                             <button 
                              type="button" 
                              onClick={fetchCoordinates}
                              disabled={fetchingCoords}
                              className="p-2 rounded-lg bg-white border border-ghost-600/30 hover:border-ghost-accent text-ghost-accent hover:text-ghost-accent-light transition-all disabled:opacity-50 shadow-sm"
                              title="Fetch Coordinates"
                            >
                               <Search className={clsx("w-4 h-4", fetchingCoords && "animate-spin")} />
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-semibold text-ghost-300 mb-1 uppercase tracking-wider">Latitude</label>
                            <input required type="number" step="any" value={newDzLat} onChange={e=>setNewDzLat(e.target.value)} className="ghost-input py-2 text-sm font-mono" placeholder="Auto-filled" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-ghost-300 mb-1 uppercase tracking-wider">Longitude</label>
                            <input required type="number" step="any" value={newDzLng} onChange={e=>setNewDzLng(e.target.value)} className="ghost-input py-2 text-sm font-mono" placeholder="Auto-filled" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-ghost-300 mb-1 uppercase tracking-wider">Address Context (Optional)</label>
                          <textarea value={newDzAddress} onChange={e=>setNewDzAddress(e.target.value)} className="ghost-input py-2 text-sm min-h-[60px]" placeholder="Specific instructions for finding the drop box..." />
                        </div>
                        <button type="submit" disabled={submittingDz} className="btn-ghost w-full py-2 text-sm disabled:opacity-60">
                          {submittingDz ? 'Adding...' : 'Add Dropzone'}
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {/* Drop Submissions Table */}
            {tab === 'dropsubmissions' && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-ghost-800/50 border-b border-ghost-600/20">
                      <th className="px-6 py-4 text-left text-xs font-bold text-ghost-200 uppercase tracking-widest">Item Info</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-ghost-200 uppercase tracking-widest">Dropzone</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-ghost-200 uppercase tracking-widest">Status</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-ghost-200 uppercase tracking-widest">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ghost-700/30">
                    {submissions.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="px-5 py-8 text-center text-ghost-400 text-xs italic">
                          No drop submissions found.
                        </td>
                      </tr>
                    ) : submissions.map(s => {
                      const dz = dropzones.find(d => d.id === s.dropzoneId);
                      return (
                        <tr key={s.id} className="hover:bg-ghost-700/20 transition-colors">
                          <td className="px-5 py-4">
                            <p className="font-medium text-ghost-100">{s.itemName || 'Unnamed Item'}</p>
                            <p className="text-[10px] text-ghost-500 font-mono">ID: {s.qrId.slice(0, 8)}</p>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3 h-3 text-ghost-400" />
                              <span className="text-ghost-200 text-xs">{dz?.name || 'Unknown Zone'}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className={clsx(
                              "badge text-[10px]",
                              s.status === 'pending' ? "status-pending" : "bg-green-500/20 text-green-400"
                            )}>
                              {s.status}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            {s.status === 'pending' ? (
                              <button
                                onClick={() => handleReceiveItem(s)}
                                className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-primary-500 transition-all shadow-lg shadow-primary-900/40"
                              >
                                <PackageCheck className="w-3.5 h-3.5" />
                                Receive From Finder
                              </button>
                            ) : s.status === 'received' ? (
                              <div className="flex flex-col items-end gap-2">
                                <button
                                  onClick={() => handleCompleteReturn(s)}
                                  className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-500 transition-all shadow-lg shadow-green-900/40"
                                >
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                  Handover to Owner
                                </button>
                                <p className="text-[10px] text-ghost-400">Owner OTP: <span className="text-ghost-200 font-mono font-bold bg-ghost-700 px-1 rounded">{s.ownerOtp}</span></p>
                              </div>
                            ) : (
                              <div className="flex flex-col items-end">
                                <div className="flex items-center gap-1.5 text-xs text-ghost-400 font-bold italic">
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  Returned to Owner
                                </div>
                                <p className="text-[10px] text-ghost-500 mt-1">Lifecycle Completed</p>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
