"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function InventoryError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Inventory route failed to render.");
  }, []);

  return (
    <main className="inventory-error" role="alert">
      <p className="eyebrow">INVENTORY UNAVAILABLE</p>
      <h1>We couldn’t load inventory.</h1>
      <p>Check the database connection and try again. Your products and stock records have not been changed.</p>
      <div className="inventory-error-actions">
        <button className="submit-button" type="button" onClick={reset}>Try again</button>
        <Link href="/dashboard">Return to dashboard</Link>
      </div>
    </main>
  );
}