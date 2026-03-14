"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ArrowLeft, MapPin, Clock, Users, Store, Loader2, CheckCircle, Search, X } from "lucide-react";
import Link from "next/link";

const MapPicker = dynamic(() => import("@/components/ui/MapPicker"), { ssr: false });

const ZONE_TYPES = ["General Store", "Cafe", "Medical Store", "Pharmacy", "Library", "Other"];

interface Suggestion {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

export default function AddDropZonePage() {
  const [name, setName] = useState("");
  const [type, setType] = useState("General Store");
  const [hours, setHours] = useState("");
  const [capacity, setCapacity] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [nameInvalid, setNameInvalid] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (searchQuery.trim().length < 3) { setSuggestions([]); return; }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=6`,
          { headers: { "Accept-Language": "en" } }
        );
        const data: Suggestion[] = await res.json();
        setSuggestions(data);
        setShowSuggestions(true);
      } catch { setSuggestions([]); }
      finally { setSearching(false); }
    }, 400);
  }, [searchQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const pickSuggestion = (s: Suggestion) => {
    const newLat = parseFloat(s.lat);
    const newLng = parseFloat(s.lon);
    setLat(newLat);
    setLng(newLng);
    setAddress(s.display_name);
    setSearchQuery(s.display_name.split(",").slice(0, 2).join(","));
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleMapClick = async (newLat: number, newLng: number) => {
    setLat(newLat);
    setLng(newLng);
    // Reverse geocode
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${newLat}&lon=${newLng}&format=json`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await res.json();
      const addr = data.display_name ?? `${newLat.toFixed(5)}, ${newLng.toFixed(5)}`;
      setAddress(addr);
      setSearchQuery(addr.split(",").slice(0, 2).join(","));
    } catch {
      setAddress(`${newLat.toFixed(5)}, ${newLng.toFixed(5)}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Zone name is required — please fill in the field above.");
      setNameInvalid(true);
      nameInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      nameInputRef.current?.focus();
      return;
    }
    if (lat === null || lng === null) { setError("Please select a location using the search box or map."); return; }
    setSaving(true); setError(""); setNameInvalid(false);
    try {
      await addDoc(collection(db, "dropZones"), {
        name: name.trim(), type, address, lat, lng,
        hours: hours.trim(),
        capacity: capacity ? Number(capacity) : null,
        itemCount: 0, status: "active", createdAt: serverTimestamp(),
      });
      setDone(true);
    } catch (e: any) {
      setError(e.message ?? "Failed to save. Check Firestore rules.");
    } finally { setSaving(false); }
  };

  const resetForm = () => {
    setDone(false); setName(""); setType("General Store");
    setLat(null); setLng(null); setAddress(""); setHours(""); setCapacity(""); setSearchQuery("");
  };

  if (done) {
    return (
      <div className="max-w-lg mx-auto flex flex-col items-center justify-center py-20 gap-4 text-center">
        <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-emerald-500" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">Drop Zone Added!</h2>
        <p className="text-sm text-gray-500">"{name}" is now live and visible to finders.</p>
        <div className="flex gap-3 mt-2">
          <button onClick={resetForm} className="btn-secondary">Add Another</button>
          <Link href="/drop-zones" className="btn-primary">View All Zones</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <Link href="/drop-zones" className="p-2 rounded-xl hover:bg-purple-50 text-gray-400 hover:text-purple-600 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-purple-900">Add Drop Zone</h1>
          <p className="text-sm text-gray-500">Register a safe location where finders can leave lost items</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Zone details */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-gray-800 text-sm">Zone Details</h2>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Zone Name *</label>
            <div className="relative">
              <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={nameInputRef}
                value={name}
                onChange={e => { setName(e.target.value); if (e.target.value.trim()) setNameInvalid(false); }}
                placeholder="e.g. Ayush General Store"
                className={`input-field pl-9 ${nameInvalid ? "border-rose-400 ring-2 ring-rose-200 focus:ring-rose-300" : ""}`}
              />
            </div>
            {nameInvalid && (
              <p className="text-xs text-rose-600 mt-1">This field is required</p>
            )}
          </div>

          {/* Type chips */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Zone Type</label>
            <div className="flex flex-wrap gap-2">
              {ZONE_TYPES.map(t => (
                <button
                  key={t} type="button" onClick={() => setType(t)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    type === t ? "bg-purple-600 text-white shadow-sm" : "bg-purple-50 text-purple-700 hover:bg-purple-100"
                  }`}
                >{t}</button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                <Clock className="inline w-3 h-3 mr-1" />Hours
              </label>
              <input value={hours} onChange={e => setHours(e.target.value)} placeholder="e.g. 9am – 9pm" className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                <Users className="inline w-3 h-3 mr-1" />Max Capacity
              </label>
              <input value={capacity} onChange={e => setCapacity(e.target.value)} type="number" min="1" placeholder="e.g. 20" className="input-field" />
            </div>
          </div>
        </div>

        {/* Location search + map */}
        <div className="card p-5 space-y-4">
          <div>
            <h2 className="font-semibold text-gray-800 text-sm">Location *</h2>
            <p className="text-xs text-gray-500 mt-0.5">Search by name or address, then fine-tune by clicking on the map</p>
          </div>

          {/* Address search */}
          <div className="relative" ref={searchRef}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                placeholder="Search location — e.g. Ayush Store, Mumbai"
                className="input-field pl-9 pr-9"
              />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-500 animate-spin" />
              )}
              {!searching && searchQuery && (
                <button type="button" onClick={() => { setSearchQuery(""); setSuggestions([]); setShowSuggestions(false); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Dropdown suggestions */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white rounded-2xl shadow-xl border border-purple-100 overflow-hidden">
                {suggestions.map(s => (
                  <button
                    key={s.place_id}
                    type="button"
                    onClick={() => pickSuggestion(s)}
                    className="w-full text-left px-4 py-3 hover:bg-purple-50 transition-colors flex items-start gap-3 border-b border-gray-50 last:border-0"
                  >
                    <MapPin className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700 leading-snug line-clamp-2">{s.display_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Map */}
          <MapPicker lat={lat} lng={lng} onChange={handleMapClick} />

          {/* Selected address */}
          {address && (
            <div className="flex items-start gap-2 bg-purple-50 rounded-xl px-3 py-2.5">
              <MapPin className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-purple-700 leading-relaxed">{address}</p>
            </div>
          )}
        </div>

        {error && (
          <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-4 py-2.5">{error}</p>
        )}

        <button type="submit" disabled={saving} className="btn-primary w-full justify-center py-3">
          {saving
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
            : <><MapPin className="w-4 h-4" /> Register Drop Zone</>
          }
        </button>
      </form>
    </div>
  );
}
