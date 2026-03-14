"use client";

import { useState, useRef, useCallback } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { QRCodeCanvas } from "qrcode.react";
import {
  Upload, X, ImageIcon, Loader2, CheckCircle2,
  Download, ArrowLeft, Package, FileText, Tag,
} from "lucide-react";
import Link from "next/link";

type Step = "form" | "uploading" | "success";

const CATEGORIES = [
  "Electronics", "Accessories", "Bags", "Keys",
  "Documents", "Clothing", "Jewellery", "Sports", "Other",
];

// Compress image to base64 (max 500x500, JPEG 0.75)
function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 500;
      let { width, height } = img;
      if (width > height) { if (width > MAX) { height = Math.round(height * MAX / width); width = MAX; } }
      else                 { if (height > MAX) { width = Math.round(width * MAX / height); height = MAX; } }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.75));
    };
    img.onerror = reject;
    img.src = url;
  });
}

export default function RegisterItemPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Other");
  const [ownerName, setOwnerName] = useState("");
  const [ownerContact, setOwnerContact] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [step, setStep] = useState<Step>("form");
  const [registeredItem, setRegisteredItem] = useState<{ id: string; qrUrl: string; itemName: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Please select an image file."); return; }
    if (file.size > 10 * 1024 * 1024) { setError("Image must be under 10MB."); return; }
    setError(null);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleImageChange({ target: { files: [file] } } as any);
  }, []);

  const removeImage = () => { setImageFile(null); setImagePreview(null); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) { setError("Item name is required."); return; }
    if (!imageFile)   { setError("Please upload an item image."); return; }

    setStep("uploading");
    setUploadProgress(20);

    try {
      // Compress image client-side → base64
      const imageBase64 = await compressImage(imageFile);
      setUploadProgress(60);

      // Save everything to Firestore (no Storage needed)
      const docRef = await addDoc(collection(db, "items"), {
        name: name.trim(),
        description: description.trim(),
        category,
        ownerName: ownerName.trim(),
        ownerContact: ownerContact.trim(),
        imageBase64,          // compressed image stored directly
        status: "lost",
        createdAt: serverTimestamp(),
        scans: 0,
      });

      setUploadProgress(100);
      const scanUrl = `${window.location.origin}/scan/${docRef.id}`;
      setRegisteredItem({ id: docRef.id, qrUrl: scanUrl, itemName: name.trim() });
      setStep("success");
    } catch (err: any) {
      console.error("Registration error:", err);
      const code = err?.code ?? "";
      let message = "Something went wrong. Please try again.";
      if (code === "permission-denied" || code === "firestore/permission-denied")
        message = "Firestore permission denied. Please update your Firestore rules to: allow read, write: if true;";
      else if (err?.message) message = err.message;
      setError(message);
      setStep("form");
    }
  };

  const downloadQR = () => {
    const canvas = document.getElementById("qr-canvas") as HTMLCanvasElement;
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `GhostQR-${registeredItem?.id ?? "item"}.png`;
    a.click();
  };

  const resetForm = () => {
    setStep("form"); setName(""); setDescription(""); setCategory("Other");
    setOwnerName(""); setOwnerContact(""); setImageFile(null); setImagePreview(null);
    setUploadProgress(0);
  };

  // ── Uploading ─────────────────────────────────────────────────────────────
  if (step === "uploading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="card p-10 text-center max-w-sm w-full space-y-5">
          <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto">
            <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-800">Registering Item…</h2>
            <p className="text-sm text-gray-500 mt-1">
              {uploadProgress < 60 ? "Compressing image…" : uploadProgress < 100 ? "Saving to database…" : "Done!"}
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Progress</span><span>{uploadProgress}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full transition-all duration-500"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Success / QR ──────────────────────────────────────────────────────────
  if (step === "success" && registeredItem) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="card p-8 max-w-md w-full space-y-6 text-center animate-slide-in">
          <div className="space-y-2">
            <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7 text-emerald-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Item Registered!</h2>
            <p className="text-sm text-gray-500">
              <span className="font-medium text-gray-700">"{registeredItem.itemName}"</span> saved to Firestore.
              Print or save the QR below and attach it to the item.
            </p>
          </div>

          {/* QR Code */}
          <div className="flex flex-col items-center gap-3">
            <div className="bg-white border-2 border-purple-200 rounded-2xl p-5 shadow-card-md inline-block">
              <QRCodeCanvas
                id="qr-canvas"
                value={registeredItem.qrUrl}
                size={200}
                bgColor="#ffffff"
                fgColor="#4c1d95"
                level="H"
              />
            </div>
            <div className="bg-purple-50 rounded-xl px-4 py-2 text-xs font-mono text-purple-700 break-all max-w-full">
              ID: {registeredItem.id}
            </div>
            <div className="bg-gray-50 rounded-xl px-4 py-2 text-xs text-gray-500 break-all max-w-full">
              {registeredItem.qrUrl}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={downloadQR} className="btn-primary flex-1 justify-center">
              <Download className="w-4 h-4" /> Download QR
            </button>
            <button onClick={resetForm} className="btn-secondary flex-1 justify-center">
              Register Another
            </button>
          </div>
          <Link href="/items" className="text-sm text-purple-600 hover:text-purple-700 font-medium block">
            ← View all items
          </Link>
        </div>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/items" className="p-2 rounded-xl hover:bg-purple-50 text-gray-500 hover:text-purple-600 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-purple-900">Register New Item</h1>
          <p className="text-sm text-gray-500">Fill in the details and get a QR code to attach to the item.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Image Upload */}
        <div className="card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-purple-500" />
            <h3 className="font-semibold text-gray-800 text-sm">Item Photo</h3>
            <span className="text-rose-500 text-xs">*required</span>
            <span className="ml-auto text-[11px] text-gray-400">Image is compressed & stored in Firestore</span>
          </div>

          {imagePreview ? (
            <div className="relative rounded-2xl overflow-hidden border-2 border-purple-200">
              <img src={imagePreview} alt="Preview" className="w-full h-56 object-cover" />
              <button
                type="button" onClick={removeImage}
                className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-gray-600 hover:text-rose-600 p-1.5 rounded-lg shadow transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="absolute bottom-3 left-3 bg-black/50 text-white text-xs px-2 py-1 rounded-lg backdrop-blur-sm">
                {imageFile?.name}
              </div>
            </div>
          ) : (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-purple-200 rounded-2xl p-10 text-center
                         hover:border-purple-400 hover:bg-purple-50/50 transition-all duration-200 cursor-pointer group"
            >
              <div className="w-12 h-12 bg-purple-100 group-hover:bg-purple-200 rounded-2xl flex items-center justify-center mx-auto mb-3 transition-colors">
                <Upload className="w-6 h-6 text-purple-600" />
              </div>
              <p className="text-sm font-medium text-gray-700">Drop your image here or <span className="text-purple-600">browse</span></p>
              <p className="text-xs text-gray-400 mt-1">PNG, JPG, WEBP up to 10MB — auto-compressed</p>
            </div>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
        </div>

        {/* Item Details */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-purple-500" />
            <h3 className="font-semibold text-gray-800 text-sm">Item Details</h3>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1.5">
              Item Name <span className="text-rose-500">*</span>
            </label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Black Leather Wallet" className="input-field" maxLength={80} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1.5">Category</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button key={cat} type="button" onClick={() => setCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    category === cat ? "bg-purple-600 text-white shadow-sm" : "bg-purple-50 text-purple-700 hover:bg-purple-100"
                  }`}>
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1.5">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the item — color, brand, distinguishing features…"
              rows={3} className="input-field resize-none" maxLength={500} />
            <p className="text-[11px] text-gray-400 mt-1 text-right">{description.length}/500</p>
          </div>
        </div>

        {/* Owner Info */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-purple-500" />
            <h3 className="font-semibold text-gray-800 text-sm">Owner Info</h3>
            <span className="text-gray-400 text-xs">(optional)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1.5">Owner Name</label>
              <input type="text" value={ownerName} onChange={(e) => setOwnerName(e.target.value)}
                placeholder="e.g. Atharva Sonawane" className="input-field" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1.5">Contact / Phone</label>
              <input type="text" value={ownerContact} onChange={(e) => setOwnerContact(e.target.value)}
                placeholder="e.g. +91 98765 43210" className="input-field" />
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 rounded-xl flex items-start gap-2">
            <X className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-3 pb-6">
          <Link href="/items" className="btn-secondary flex-1 justify-center">Cancel</Link>
          <button type="submit" className="btn-primary flex-1 justify-center py-2.5">
            <Tag className="w-4 h-4" />
            Register &amp; Generate QR
          </button>
        </div>
      </form>
    </div>
  );
}
