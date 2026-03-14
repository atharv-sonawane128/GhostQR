"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Search, Plus, Filter, QrCode, Eye, PackageOpen } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import Link from "next/link";

type FilterType = "All" | "lost" | "found" | "pending" | "returned";

interface Item {
  id: string;
  name: string;
  ownerName?: string;
  category?: string;
  status: string;
  createdAt?: any;
}

const FILTERS: FilterType[] = ["All", "lost", "found", "pending", "returned"];
const FILTER_LABELS: Record<FilterType, string> = {
  All: "All", lost: "Lost", found: "Found", pending: "Pending", returned: "Returned",
};

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("All");

  useEffect(() => {
    const fetch = async () => {
      try {
        const q = query(collection(db, "items"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        setItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as Item)));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  const filtered = items.filter(item => {
    const matchesFilter = filter === "All" || item.status === filter;
    const matchesSearch = item.name?.toLowerCase().includes(search.toLowerCase()) ||
      item.ownerName?.toLowerCase().includes(search.toLowerCase()) ||
      item.id.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const formatDate = (item: Item) => {
    if (!item.createdAt?.seconds) return "—";
    return new Date(item.createdAt.seconds * 1000).toLocaleDateString("en-GB");
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-purple-900">Items</h1>
          <p className="text-sm text-gray-500">
            {loading ? "Loading…" : `${items.length} registered item${items.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Link href="/items/new" className="btn-primary">
          <Plus className="w-4 h-4" /> Register Item
        </Link>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, owner, or ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-9 h-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === f ? "bg-purple-600 text-white" : "bg-purple-50 text-purple-700 hover:bg-purple-100"
              }`}
            >
              {FILTER_LABELS[f]}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
            <PackageOpen className="w-10 h-10 text-purple-200" />
            <p className="text-sm font-medium">
              {items.length === 0 ? "No items registered yet." : "No items match your search."}
            </p>
            {items.length === 0 && (
              <Link href="/items/new" className="btn-primary text-xs">Register your first item</Link>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-purple-50/60 border-b border-purple-100">
                    <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Item</th>
                    <th className="text-left text-xs font-semibold text-gray-500 px-3 py-3 hidden md:table-cell">Owner</th>
                    <th className="text-left text-xs font-semibold text-gray-500 px-3 py-3 hidden lg:table-cell">Category</th>
                    <th className="text-left text-xs font-semibold text-gray-500 px-3 py-3">Status</th>
                    <th className="text-left text-xs font-semibold text-gray-500 px-3 py-3 hidden sm:table-cell">Date</th>
                    <th className="text-left text-xs font-semibold text-gray-500 px-3 py-3">QR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-50">
                  {filtered.map(item => (
                    <tr key={item.id} className="hover:bg-purple-50/30 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-gray-800 text-xs">{item.name}</p>
                        <p className="text-gray-400 text-[11px] font-mono">{item.id.slice(0, 12)}…</p>
                      </td>
                      <td className="px-3 py-3.5 text-xs text-gray-600 hidden md:table-cell">{item.ownerName || "—"}</td>
                      <td className="px-3 py-3.5 hidden lg:table-cell">
                        <span className="badge-purple">{item.category || "—"}</span>
                      </td>
                      <td className="px-3 py-3.5"><StatusBadge status={item.status as any} /></td>
                      <td className="px-3 py-3.5 text-xs text-gray-400 hidden sm:table-cell">{formatDate(item)}</td>
                      <td className="px-3 py-3.5">
                        <Link href={`/items/${item.id}`} className="p-1.5 text-purple-500 hover:bg-purple-50 rounded-lg transition-colors inline-flex" title="View QR">
                          <QrCode className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t border-purple-50 text-xs text-gray-500">
              Showing {filtered.length} of {items.length} item{items.length !== 1 ? "s" : ""}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
