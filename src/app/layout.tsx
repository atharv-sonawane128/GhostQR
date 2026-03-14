import type { Metadata } from "next";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import AdminShell from "@/components/layout/AdminShell";

export const metadata: Metadata = {
  title: "GhostQR — Admin Dashboard",
  description: "Lost & Found management system — Admin Panel",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AdminShell>{children}</AdminShell>
      </body>
    </html>
  );
}
