import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Marketline | Store Management",
  description: "Secure supermarket operations and point of sale.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-NG">
      <body>{children}</body>
    </html>
  );
}