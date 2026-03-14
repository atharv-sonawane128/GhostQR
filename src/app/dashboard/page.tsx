"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  PackageSearch, CheckCircle, XCircle, MessageSquare,
  MapPin, QrCode, TrendingUp, Clock, Eye, Scan,
  PackageOpen,
} from "lucide-react";
import StatsCard from "@/components/ui/StatsCard";
import StatusBadge from "@/components/ui/StatusBadge";
import Link from "next/link";

const PIE_COLORS = ["#10b981", "#f43f5e", "#7c3aed"];

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-purple-100 rounded-xl shadow-card-md p-3 text-xs">
      <p className="font-semibold text-purple-900 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="capitalize">
          {p.name}: <span className="font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

interface Item {
  id: string;
  name: string;
  ownerName?: string;
  category?: string;
  status: string;
  createdAt?: any;
}

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    const fetchItems = async () => {
      try {
        const q = query(collection(db, "items"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        setItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as Item)));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, []);

  // Derived stats
  const total   = items.length;
  const found   = items.filter(i => i.status === "found" || i.status === "returned").length;
  const lost    = items.filter(i => i.status === "lost").length;
  const pending = items.filter(i => i.status === "pending").length;
  const recentItems = items.slice(0, 6);

  // Pie data (only non-zero slices)
  const pieData = [
    { name: "Found",   value: found   },
    { name: "Lost",    value: lost    },
    { name: "Pending", value: pending },
  ].filter(d => d.value > 0);

  // Trend — group last 7 days by day name
  const trendData = (() => {
    const days: Record<string, { day: string; lost: number; found: number }> = {};
    const dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toDateString();
      days[key] = { day: dayNames[d.getDay()], lost: 0, found: 0 };
    }
    items.forEach(item => {
      if (!item.createdAt?.seconds) return;
      const d = new Date(item.createdAt.seconds * 1000);
      const key = d.toDateString();
      if (!days[key]) return;
      if (item.status === "lost" || item.status === "pending") days[key].lost++;
      else days[key].found++;
    });
    return Object.values(days);
  })();

  const formatDate = (item: Item) => {
    if (!item.createdAt?.seconds) return "—";
    return new Date(item.createdAt.seconds * 1000).toLocaleDateString("en-GB");
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-purple-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <Link href="/items/new" className="btn-primary">
          <QrCode className="w-4 h-4" /> Register Item
        </Link>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatsCard title="Total Items"  value={loading ? "—" : total}   subtitle="All registered"   icon={PackageSearch}  iconColor="text-purple-600"  iconBg="bg-purple-100"  />
        <StatsCard title="Found"        value={loading ? "—" : found}   subtitle="Returned/found"   icon={CheckCircle}    iconColor="text-emerald-600" iconBg="bg-emerald-100" />
        <StatsCard title="Lost"         value={loading ? "—" : lost}    subtitle="Still missing"    icon={XCircle}        iconColor="text-rose-600"    iconBg="bg-rose-100"    />
        <StatsCard title="Pending"      value={loading ? "—" : pending} subtitle="Awaiting update"  icon={MessageSquare}  iconColor="text-blue-600"    iconBg="bg-blue-100"    />
        <StatsCard title="Drop Zones"   value="—"                       subtitle="Coming soon"      icon={MapPin}         iconColor="text-amber-600"   iconBg="bg-amber-100"   />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Area chart */}
        <div className="card p-5 xl:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-gray-800 text-sm">Item Activity (Last 7 Days)</h3>
              <p className="text-xs text-gray-400">Based on registered items</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" />Lost</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />Found</span>
            </div>
          </div>
          {mounted && (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="gradLost"  x1="0" y1="0" x2="0" y2="1"><stop offset="5%"  stopColor="#7c3aed" stopOpacity={0.15}/><stop offset="95%" stopColor="#7c3aed" stopOpacity={0}/></linearGradient>
                  <linearGradient id="gradFound" x1="0" y1="0" x2="0" y2="1"><stop offset="5%"  stopColor="#10b981" stopOpacity={0.15}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f0ff" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="lost"  stroke="#7c3aed" strokeWidth={2} fill="url(#gradLost)"  dot={{ fill: "#7c3aed", r: 3, strokeWidth: 0 }} />
                <Area type="monotone" dataKey="found" stroke="#10b981" strokeWidth={2} fill="url(#gradFound)" dot={{ fill: "#10b981", r: 3, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Donut */}
        <div className="card p-5">
          <div className="mb-4">
            <h3 className="font-semibold text-gray-800 text-sm">Status Breakdown</h3>
            <p className="text-xs text-gray-400">All registered items</p>
          </div>
          {mounted && pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="45%" innerRadius={55} outerRadius={78} paddingAngle={4} dataKey="value">
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} strokeWidth={0} />)}
                </Pie>
                <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-gray-600">{v}</span>} />
                <Tooltip formatter={(v) => [`${v} items`]} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">
              No data yet
            </div>
          )}
        </div>
      </div>

      {/* Recent items table */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-purple-50">
          <div>
            <h3 className="font-semibold text-gray-800 text-sm">Recent Items</h3>
            <p className="text-xs text-gray-400">Most recently registered</p>
          </div>
          <Link href="/items" className="text-xs text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" /> View all
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
          </div>
        ) : recentItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-gray-400 gap-3">
            <PackageOpen className="w-10 h-10 text-purple-200" />
            <p className="text-sm">No items registered yet.</p>
            <Link href="/items/new" className="btn-primary text-xs">Register your first item</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-purple-50/50">
                  <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Item</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-3 py-3 hidden md:table-cell">Owner</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-3 py-3 hidden lg:table-cell">Category</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-3 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-3 py-3 hidden sm:table-cell">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-50">
                {recentItems.map((item) => (
                  <tr key={item.id} className="hover:bg-purple-50/30 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-800 text-xs">{item.name}</p>
                      <p className="text-gray-400 text-[11px] font-mono">{item.id.slice(0, 8)}…</p>
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-600 hidden md:table-cell">{item.ownerName || "—"}</td>
                    <td className="px-3 py-3 hidden lg:table-cell"><span className="badge-purple">{item.category || "—"}</span></td>
                    <td className="px-3 py-3"><StatusBadge status={item.status as any} /></td>
                    <td className="px-3 py-3 text-xs text-gray-400 hidden sm:table-cell">{formatDate(item)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="card p-5">
        <h3 className="font-semibold text-gray-800 text-sm mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { href: "/items/new",  icon: QrCode,        label: "Register Item",     bg: "bg-purple-50 hover:bg-purple-100",   color: "text-purple-700"  },
            { href: "/chats",      icon: MessageSquare, label: "View Chats",        bg: "bg-blue-50 hover:bg-blue-100",       color: "text-blue-700"    },
            { href: "/drop-zones", icon: MapPin,        label: "Drop Zones",        bg: "bg-amber-50 hover:bg-amber-100",     color: "text-amber-700"   },
            { href: "/items",      icon: TrendingUp,    label: "All Items",         bg: "bg-emerald-50 hover:bg-emerald-100", color: "text-emerald-700" },
          ].map(({ href, icon: Icon, label, bg, color }) => (
            <Link key={href} href={href}
              className={`${bg} ${color} rounded-xl p-4 flex flex-col items-center gap-2 transition-all duration-200 hover:-translate-y-0.5`}>
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium text-center">{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
