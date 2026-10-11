import { redirect } from "next/navigation";
import Link from "next/link";
import { Boxes, LogOut, ShoppingBasket, ShoppingCart } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <div className="brand-lockup"><span className="brand-mark"><ShoppingBasket size={21} /></span><span>Marketline<span className="brand-period">.</span></span></div>
        <form action="/api/auth/logout" method="post"><button className="logout-button" type="submit"><LogOut size={16} /> Sign out</button></form>
      </header>
      <section className="dashboard-content">
        <p className="eyebrow">STORE OPERATIONS</p>
        <h1>Welcome, {user.name}</h1>
        <p className="dashboard-subtitle">Signed in as {user.role.replaceAll("_", " ").toLowerCase()} · {user.email}</p>
        <Link className="dashboard-action" href="/pos"><ShoppingCart size={18} /> Open point of sale</Link>
        {(user.role === "owner" || user.role === "manager") && <Link className="dashboard-action" href="/inventory"><Boxes size={18} /> Manage inventory</Link>}
        <div className="phase-notice"><span className="notice-indicator" /><p><strong>Inventory management is connected to MongoDB.</strong> POS checkout and sales reporting are the next migration phase. No local demo figures are presented as store records.</p></div>
      </section>
    </main>
  );
}