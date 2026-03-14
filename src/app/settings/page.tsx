"use client";

import { User, Lock, Bell, Shield, Palette } from "lucide-react";

const sections = [
  {
    icon: User,
    title: "Admin Profile",
    desc: "Update your name, email, and avatar",
    fields: [
      { label: "Full Name",   type: "text",     value: "Admin GhostQR" },
      { label: "Email",       type: "email",    value: "admin@ghostqr.com" },
    ],
  },
  {
    icon: Lock,
    title: "Security",
    desc: "Manage your password and login sessions",
    fields: [
      { label: "Current Password", type: "password", value: "" },
      { label: "New Password",     type: "password", value: "" },
    ],
  },
  {
    icon: Bell,
    title: "Notifications",
    desc: "Configure when and how you receive alerts",
    fields: [],
    toggles: [
      { label: "Item scanned alerts",    enabled: true  },
      { label: "New chat notifications", enabled: true  },
      { label: "Drop zone updates",      enabled: false },
      { label: "Weekly summary email",   enabled: true  },
    ],
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-purple-900">Settings</h1>
        <p className="text-sm text-gray-500">Manage your account and app preferences</p>
      </div>

      <div className="space-y-4">
        {sections.map(({ icon: Icon, title, desc, fields, toggles }) => (
          <div key={title} className="card p-5 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-purple-50">
              <div className="w-9 h-9 bg-purple-100 rounded-xl flex items-center justify-center">
                <Icon className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-800 text-sm">{title}</p>
                <p className="text-xs text-gray-400">{desc}</p>
              </div>
            </div>

            {fields && fields.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {fields.map((f) => (
                  <div key={f.label}>
                    <label className="text-xs font-medium text-gray-600 block mb-1.5">{f.label}</label>
                    <input type={f.type} defaultValue={f.value} className="input-field" />
                  </div>
                ))}
              </div>
            )}

            {toggles && (
              <div className="space-y-3">
                {toggles.map((t) => (
                  <label key={t.label} className="flex items-center justify-between cursor-pointer group">
                    <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">{t.label}</span>
                    <div className={`relative w-10 h-5.5 rounded-full transition-colors ${t.enabled ? "bg-purple-600" : "bg-gray-200"}`}>
                      <input type="checkbox" className="sr-only" defaultChecked={t.enabled} />
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${t.enabled ? "left-5" : "left-0.5"}`} />
                    </div>
                  </label>
                ))}
              </div>
            )}

            {fields && fields.length > 0 && (
              <div className="flex justify-end">
                <button className="btn-primary">Save Changes</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
