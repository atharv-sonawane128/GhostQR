"use client";

import { useEffect, useState, use } from "react";
import { collection, getDocs, addDoc, serverTimestamp, updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import dynamic from "next/dynamic";
import { MapPin, Ghost, CheckCircle, ArrowLeft, Clock, Package, Loader2, Navigation } from "lucide-react";
import Link from "next/link";
import type { Zone } from "@/components/ui/ZoneMap";

const ZoneMap = dynamic(() => import("@/components/ui/ZoneMap"), { ssr: false });

interface FireZone {
  id: string;
  name: string;
  type?: string;
  address?: string;
  lat: number;
  lng: number;
  hours?: string;
  itemCount?: number;
  capacity?: number | null;
  status?: string;
}

/** Haversine distance in km */
function distance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

type Step = "location" | "select" | "done";

export default function DropPage({ params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = use(params);
  const [step, setStep] = useState<Step>("location");
  const [zones, setZones] = useState<(FireZone & { distance: number })[]>([]);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [loadingZones, setLoadingZones] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [dropping, setDropping] = useState(false);
  const [droppedZone, setDroppedZone] = useState<FireZone | null>(null);
  const [locError, setLocError] = useState("");

  const fetchZones = async (lat: number | null, lng: number | null) => {
    setLoadingZones(true);
    try {
      const snap = await getDocs(collection(db, "dropZones"));
      const raw = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as FireZone))
        .filter(z => z.status !== "inactive" && z.lat && z.lng);

      const withDist = raw.map(z => ({
        ...z,
        distance: lat && lng ? distance(lat, lng, z.lat, z.lng) : 0,
      }));
      withDist.sort((a, b) => a.distance - b.distance);
      setZones(withDist);
    } catch (e) { console.error(e); }
    finally { setLoadingZones(false); }
  };

  const requestLocation = () => {
    setLocError("");
    if (!navigator.geolocation) {
      setLocError("Geolocation not supported by this browser.");
      proceedWithoutLocation();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        setUserLat(pos.coords.latitude);
        setUserLng(pos.coords.longitude);
        fetchZones(pos.coords.latitude, pos.coords.longitude);
        setStep("select");
      },
      () => {
        setLocError("Location access denied. Showing all zones instead.");
        proceedWithoutLocation();
      }
    );
  };

  const proceedWithoutLocation = () => {
    fetchZones(null, null);
    setStep("select");
  };

  const confirmDrop = async () => {
    if (!selected || dropping) return;
    setDropping(true);
    const zone = zones.find(z => z.id === selected)!;
    try {
      await updateDoc(doc(db, "items", itemId), {
        status: "pending",
        droppedAt: zone.name,
        droppedAtId: zone.id,
        droppedTime: serverTimestamp(),
      });
      await addDoc(collection(db, "notifications"), {
        type: "drop",
        title: "Item Dropped at Zone",
        description: `Your item was dropped at "${zone.name}"${zone.address ? ` — ${zone.address.split(",").slice(0, 2).join(",")}` : ""}.`,
        itemId,
        read: false,
        createdAt: serverTimestamp(),
      });
      setDroppedZone(zone);
      setStep("done");
    } catch (e) { console.error(e); }
    finally { setDropping(false); }
  };

  // ── Done ──────────────────────────────────────────────────────────
  if (step === "done" && droppedZone) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-800 via-purple-700 to-purple-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
          <div className="bg-gradient-to-r from-purple-700 to-purple-900 px-6 py-4 flex items-center gap-3">
            <Ghost className="w-5 h-5 text-white" />
            <p className="text-white font-bold text-sm">GhostQR</p>
          </div>
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Dropped! 🎉</h2>
              <p className="text-sm text-gray-500 mt-1">You confirmed dropping the item at:</p>
              <div className="mt-3 bg-purple-50 rounded-xl px-4 py-3 text-left">
                <p className="font-semibold text-purple-900 text-sm">{droppedZone.name}</p>
                {droppedZone.type && <p className="text-xs text-purple-500 mt-0.5">{droppedZone.type}</p>}
                {droppedZone.address && (
                  <p className="text-xs text-purple-600 mt-1 leading-relaxed">
                    {droppedZone.address.split(",").slice(0, 3).join(",")}
                  </p>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-400">The owner has been notified instantly. Thank you for your honesty! 💜</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Location prompt ────────────────────────────────────────────────
  if (step === "location") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-800 via-purple-700 to-purple-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
          <div className="bg-gradient-to-r from-purple-700 to-purple-900 px-4 py-4 flex items-center gap-3">
            <Link href={`/scan/${itemId}`} className="text-white/70 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <Ghost className="w-5 h-5 text-white" />
            <p className="text-white font-bold text-sm">Find Nearest Drop Zone</p>
          </div>
          <div className="p-8 text-center space-y-5">
            <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto">
              <Navigation className="w-8 h-8 text-purple-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Share Your Location</h2>
              <p className="text-sm text-gray-500 mt-1">
                We'll find the nearest drop zone to make it easy for you. Your location is never stored.
              </p>
            </div>
            {locError && <p className="text-xs text-rose-600 bg-rose-50 rounded-xl px-3 py-2">{locError}</p>}
            <div className="space-y-2">
              <button
                onClick={requestLocation}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2"
              >
                <Navigation className="w-4 h-4" /> Allow Location
              </button>
              <button
                onClick={proceedWithoutLocation}
                className="w-full text-sm text-gray-400 hover:text-gray-600 py-2 transition-colors"
              >
                Skip — Show all zones
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Zone selection ─────────────────────────────────────────────────
  const selectedZone = zones.find(z => z.id === selected);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-800 via-purple-700 to-purple-900 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col" style={{ maxHeight: "92vh" }}>
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-700 to-purple-900 px-4 py-4 flex items-center gap-3 flex-shrink-0">
          <button onClick={() => setStep("location")} className="text-white/70 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Ghost className="w-5 h-5 text-white" />
          <div>
            <p className="text-white font-bold text-sm">Select Drop Zone</p>
            <p className="text-purple-300 text-[11px]">
              {userLat ? "Sorted by distance from you" : "All available zones"}
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingZones ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
            </div>
          ) : zones.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-3 text-center px-6">
              <MapPin className="w-10 h-10 text-purple-200" />
              <p className="text-sm font-medium">No drop zones available.</p>
              <p className="text-xs">Use the anonymous chat to coordinate with the owner.</p>
              <Link href={`/scan/${itemId}`} className="text-purple-600 text-xs font-medium">← Go back</Link>
            </div>
          ) : (
            <>
              {/* Map */}
              <div className="p-3">
                <ZoneMap
                  zones={zones.map(z => ({ ...z, distance: z.distance }))}
                  userLat={userLat}
                  userLng={userLng}
                  selectedId={selected}
                  onSelect={setSelected}
                />
              </div>

              {/* Zone list */}
              <div className="px-3 pb-3 space-y-2">
                {zones.map((zone, i) => {
                  const isSelected = selected === zone.id;
                  return (
                    <button
                      key={zone.id}
                      onClick={() => setSelected(isSelected ? null : zone.id)}
                      className={`w-full text-left rounded-2xl border-2 p-3.5 transition-all ${
                        isSelected ? "border-purple-500 bg-purple-50" : "border-gray-100 bg-gray-50 hover:border-purple-200"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${isSelected ? "bg-purple-500" : "bg-purple-100"}`}>
                          <MapPin className={`w-4 h-4 ${isSelected ? "text-white" : "text-purple-600"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            {userLat && i === 0 && (
                              <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded-full">Nearest</span>
                            )}
                            <p className="font-semibold text-gray-800 text-sm truncate">{zone.name}</p>
                          </div>
                          {zone.type && <p className="text-xs text-gray-400">{zone.type}</p>}
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {userLat && (
                              <span className="text-[11px] text-purple-600 font-semibold">
                                📍 {zone.distance < 1 ? `${(zone.distance * 1000).toFixed(0)} m` : `${zone.distance.toFixed(1)} km`} away
                              </span>
                            )}
                            {zone.hours && <span className="text-[11px] text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3" />{zone.hours}</span>}
                          </div>
                        </div>
                        {isSelected && <CheckCircle className="w-5 h-5 text-purple-500 flex-shrink-0 mt-1" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Confirm button */}
        {zones.length > 0 && (
          <div className="px-4 pb-5 pt-2 flex-shrink-0 border-t border-gray-50">
            <button
              onClick={confirmDrop}
              disabled={!selected || dropping}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2"
            >
              {dropping
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Confirming…</>
                : <><CheckCircle className="w-4 h-4" /> I've Dropped It Here</>
              }
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
