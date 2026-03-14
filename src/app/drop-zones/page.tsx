"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  MapPin, Plus, Store, Clock, Users, Loader2,
  CheckCircle, XCircle, Coffee, Pill,
} from "lucide-react";

const ZoneMap = dynamic(() => import("@/components/ui/ZoneMap"), { ssr: false });

interface Zone {
  id: string;
  name: string;
  type?: string;
  address?: string;
  lat: number;
  lng: number;
  hours?: string;
  capacity?: number | null;
  itemCount?: number;
  status?: string;
}

const typeIcons: Record<string, any> = {
  "Cafe":           Coffee,
  "Medical Store":  Pill,
  "Pharmacy":       Pill,
  "General Store":  Store,
  "Library":        Store,
  "Other":          Store,
};

const typeColors: Record<string, string> = {
  "Cafe":          "bg-amber-100 text-amber-700",
  "Medical Store": "bg-rose-100 text-rose-700",
  "Pharmacy":      "bg-rose-100 text-rose-700",
  "General Store": "bg-blue-100 text-blue-700",
  "Library":       "bg-emerald-100 text-emerald-700",
  "Other":         "bg-gray-100 text-gray-600",
};

export default function DropZonesPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "dropZones"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, snap => {
      setZones(snap.docs.map(d => ({ id: d.id, ...d.data() } as Zone)));
      setLoading(false);
    }, e => { console.error(e); setLoading(false); });
    return () => unsub();
  }, []);

  const activeZones = zones.filter(z => z.status !== "inactive");
  const selected = zones.find(z => z.id === selectedId);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-purple-900">Drop Zones</h1>
          <p className="text-sm text-gray-500">
            {loading ? "Loading…" : `${activeZones.length} active zone${activeZones.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Link href="/drop-zones/new" className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Add Zone
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
        </div>
      ) : zones.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
          <MapPin className="w-10 h-10 text-purple-200" />
          <p className="text-sm font-medium">No drop zones yet.</p>
          <p className="text-xs text-center max-w-xs">Add drop zones like stores, cafes, or pharmacies where finders can safely leave items.</p>
          <Link href="/drop-zones/new" className="btn-primary text-sm mt-2">
            <Plus className="w-4 h-4" /> Add First Zone
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Zone cards */}
          <div className="space-y-3">
            {activeZones.map(zone => {
              const TypeIcon = typeIcons[zone.type ?? "Other"] ?? Store;
              const colorCls = typeColors[zone.type ?? "Other"] ?? typeColors.Other;
              const isSelected = selectedId === zone.id;
              return (
                <button
                  key={zone.id}
                  onClick={() => setSelectedId(isSelected ? null : zone.id)}
                  className={`card-hover w-full text-left p-4 flex items-start gap-4 transition-all ${isSelected ? "ring-2 ring-purple-500" : ""}`}
                >
                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-800 text-sm">{zone.name}</p>
                      {zone.type && (
                        <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${colorCls}`}>
                          <TypeIcon className="w-3 h-3" />{zone.type}
                        </span>
                      )}
                      {zone.status === "inactive"
                        ? <span className="flex items-center gap-1 text-[10px] text-gray-400"><XCircle className="w-3 h-3" />Inactive</span>
                        : <span className="flex items-center gap-1 text-[10px] text-emerald-600"><CheckCircle className="w-3 h-3" />Active</span>
                      }
                    </div>
                    {zone.address && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{zone.address}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      {zone.hours && (
                        <span className="flex items-center gap-1 text-[11px] text-gray-400">
                          <Clock className="w-3 h-3" />{zone.hours}
                        </span>
                      )}
                      {zone.capacity != null && (
                        <span className="flex items-center gap-1 text-[11px] text-purple-500">
                          <Users className="w-3 h-3" />{zone.itemCount ?? 0}/{zone.capacity} items
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Map view */}
          <div className="card p-4 space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Zone Map</p>
            <ZoneMap
              zones={activeZones.map(z => ({ id: z.id, name: z.name, type: z.type, address: z.address, lat: z.lat, lng: z.lng }))}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
            {selected && (
              <div className="bg-purple-50 rounded-xl px-4 py-3 text-sm">
                <p className="font-semibold text-purple-900">{selected.name}</p>
                {selected.address && <p className="text-xs text-purple-600 mt-0.5">{selected.address}</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
