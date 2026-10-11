import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, Truck, ClipboardList, ReceiptText, BriefcaseBusiness, Boxes, ChartColumnIncreasing, CircleAlert, CreditCard, LayoutDashboard, LogOut, Package, Receipt, Search, ShoppingCart, Store, TrendingUp, Users, Wallet } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { Product } from "@/models/product";
import { Sale } from "@/models/sale";
import "./dashboard.css";

export const dynamic = "force-dynamic";

const money = (kobo: number) => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(kobo / 100);
const dateLabel = (date: Date) => new Intl.DateTimeFormat("en-NG", { timeZone: "Africa/Lagos", day: "2-digit", month: "short" }).format(date);
const lagosDay = (date: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
const dayKey = (date: Date) => { const p = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date); return [p.find(x => x.type === "year")?.value, p.find(x => x.type === "month")?.value, p.find(x => x.type === "day")?.value].join("-"); };
type DashboardProduct = { name: string; sku: string; stock: number; minimumStock: number; sellingPriceKobo: number; costPriceKobo?: number };
type DashboardSale = { receiptNumber: string; cashierName: string; totalKobo: number; createdAt: Date; items: { name: string; quantity: number; subtotalKobo: number }[]; payments: { method: string; amountKobo: number }[]; customer?: { name?: string } };

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  const canSeeCosts = user.role === "owner" || user.role === "manager";
  let products: DashboardProduct[] = [];
  let sales: DashboardSale[] = [];
  let dataError = false;
  try {
    await connectToDatabase();
    const [productRows, saleRows] = await Promise.all([
      Product.find({ status: "active" }).select(canSeeCosts ? "+costPriceKobo" : "-costPriceKobo").lean(),
      Sale.find({}).sort({ createdAt: -1 }).limit(1500).lean(),
    ]);
    products = productRows as unknown as DashboardProduct[];
    sales = saleRows as unknown as DashboardSale[];
  } catch {
    dataError = true;
  }

  const todayKey = dayKey(new Date());
  const monthKey = todayKey.slice(0, 7);
  const todaySales = sales.filter(s => dayKey(new Date(s.createdAt)) === todayKey);
  const monthSales = sales.filter(s => dayKey(new Date(s.createdAt)).startsWith(monthKey));
  const sumSales = (rows: DashboardSale[]) => rows.reduce((sum, s) => sum + s.totalKobo, 0);
  const lowStock = products.filter(p => p.stock <= p.minimumStock);
  const stockValue = products.reduce((sum, p) => sum + p.stock * (p.costPriceKobo ?? 0), 0);
  const stockValuationAvailable = products.every(p => typeof p.costPriceKobo === "number");
  const customerNames = new Set(sales.map(s => s.customer?.name?.trim().toLowerCase()).filter(Boolean));
  const paymentTotals = new Map<string, number>();
  for (const s of todaySales) for (const p of s.payments ?? []) paymentTotals.set(p.method, (paymentTotals.get(p.method) ?? 0) + p.amountKobo);
  const daily = Array.from({ length: 7 }, (_, index) => {
    const d = new Date(); d.setUTCDate(d.getUTCDate() - (6 - index));
    const key = dayKey(d);
    return { key, label: dateLabel(d), total: sumSales(sales.filter(s => dayKey(new Date(s.createdAt)) === key)) };
  });
  const peak = Math.max(1, ...daily.map(d => d.total));
  const productTotals = new Map<string, { name: string; qty: number; total: number }>();
  for (const sale of monthSales) for (const item of sale.items ?? []) {
    const entry = productTotals.get(item.name) ?? { name: item.name, qty: 0, total: 0 };
    entry.qty += item.quantity; entry.total += item.subtotalKobo; productTotals.set(item.name, entry);
  }
  const best = [...productTotals.values()].sort((a, b) => b.qty - a.qty).slice(0, 5);
  const nav = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, show: true },
    { href: "/pos", label: "Point of Sale", icon: ShoppingCart, show: true },
    { href: "/inventory", label: "Inventory", icon: Boxes, show: canSeeCosts },
    { href: "/employees", label: "Employees", icon: BriefcaseBusiness, show: user.role === "owner" },
    { href: "/purchases", label: "Purchases", icon: ClipboardList, show: canSeeCosts },
    { href: "/customers", label: "Customers", icon: Users, show: canSeeCosts },
    { href: "/suppliers", label: "Suppliers", icon: Truck, show: canSeeCosts },
    { href: "/expenses", label: "Expenses", icon: ReceiptText, show: canSeeCosts },
    { href: "/branches", label: "Branches", icon: Building2, show: user.role === "owner" },
  ];
  return (
    <div className="market-shell">
      <aside className="market-sidebar">
        <Link href="/dashboard" className="market-brand"><span className="market-brand-icon"><Store size={22}/></span><span>MARKETLINE<small>SUPERMARKET SYSTEM</small></span></Link>
        <div className="market-nav-label">WORKSPACE</div>
        <nav aria-label="Main navigation">
          {nav.filter(n => n.show).map(n => <Link key={n.href} href={n.href} className={n.href === "/dashboard" ? "market-nav-link active" : "market-nav-link"}><n.icon size={17}/>{n.label}</Link>)}
        </nav>

        <div className="market-sidebar-bottom"><div className="market-sidebar-help">Built for Nigerian supermarkets<br/><strong>Secure · MongoDB connected</strong></div><form action="/api/auth/logout" method="post"><button type="submit" className="market-signout"><LogOut size={17}/> Sign out</button></form></div>
      </aside>
      <main className="market-main">
        <header className="market-topbar"><div className="market-breadcrumb"><Store size={16}/> Store overview <span>/</span> Dashboard</div><div className="market-topbar-right"><span className="market-live"><span/> LIVE DATA</span><div className="market-avatar">{user.name.charAt(0).toUpperCase()}</div><div className="market-profile"><strong>{user.name}</strong><small>{user.role.replaceAll("_", " ")}</small></div></div></header>
        <div className="market-container">
          <div className="market-heading"><div><p className="market-eyebrow">STORE PERFORMANCE</p><h1>Dashboard Overview</h1><p>Welcome back, {user.name}. Here’s what’s happening in your store.</p></div><div className="market-heading-actions"><Link href="/pos" className="market-primary-action"><ShoppingCart size={17}/> New Sale</Link>{canSeeCosts && <Link href="/inventory" className="market-secondary-action"><Package size={17}/> Inventory</Link>}</div></div>
          {dataError && <div role="alert" className="market-error"><CircleAlert size={18}/> Live store data is temporarily unavailable. Please check your MongoDB connection and refresh.</div>}
          {sales.length === 1500 && <div className="market-info">Sales trends are based on the latest 1,500 transactions. Historical totals may be incomplete.</div>}
          <div className="market-stat-grid">
            <Metric icon={<ShoppingCart size={23}/>} label="Today's Sales" value={money(sumSales(todaySales))} sub={`${todaySales.length} transactions today`} tone="purple"/>
            <Metric icon={<TrendingUp size={23}/>} label="This Month's Sales" value={money(sumSales(monthSales))} sub="Current calendar month" tone="blue"/>
            <Metric icon={<Receipt size={23}/>} label="Today's Transactions" value={String(todaySales.length)} sub="Recorded checkouts" tone="purple"/>
            <Metric icon={<Package size={23}/>} label="Stock Value" value={canSeeCosts ? stockValuationAvailable ? money(stockValue) : "Not available" : "Restricted"} sub="Based on recorded item costs" tone="blue"/>
            <Metric icon={<Users size={23}/>} label="Named Customers" value={String(customerNames.size)} sub="From recent sales records" tone="blue"/>
            <Metric icon={<CircleAlert size={23}/>} label="Low Stock Items" value={String(lowStock.length)} sub="At or below reorder level" tone="purple"/>
          </div>
          <div className="market-panel-grid">
            <section className="market-panel market-sales-panel"><div className="market-panel-head"><div><h2>Sales Overview</h2><p>Last 7 days · Lagos time</p></div><span className="market-chip">7 DAYS</span></div><div className="market-chart"><div className="market-chart-bars">{daily.map(d => <div key={d.key} className="market-chart-col"><strong>{d.total ? money(d.total) : ""}</strong><div className="market-bar-track"><div className="market-bar" style={{ height: `${Math.max(d.total ? 6 : 0, d.total / peak * 100)}%` }}/></div><span>{d.label}</span></div>)}</div></div></section>
            <section className="market-panel"><div className="market-panel-head"><div><h2>Collection Summary</h2><p>Today's cashier-recorded payments</p></div><Wallet size={19}/></div><div className="market-payments">{[["cash","Cash"],["bank_transfer","Bank Transfer"],["pos_terminal","POS Terminal"],["other","Other"]].map(([key,label]) => <div key={key} className="market-payment-row"><span><span className={`market-payment-dot ${key}`}/>{label}</span><strong>{money(paymentTotals.get(key) ?? 0)}</strong></div>)}</div><div className="market-panel-total"><span>Total collected</span><strong>{money([...paymentTotals.values()].reduce((a,b)=>a+b,0))}</strong></div><p className="market-footnote">Payments are cashier-recorded, not bank-verified.</p></section>
          </div>
          <div className="market-panel-grid market-bottom-grid">
            <section className="market-panel"><div className="market-panel-head"><div><h2>Top Selling Products</h2><p>By units sold this month</p></div><TrendingUp size={18}/></div>{best.length ? <div className="market-table-scroll"><table className="market-table"><thead><tr><th>Product</th><th>Units</th><th>Sales</th></tr></thead><tbody>{best.map((p,i)=><tr key={p.name}><td><span className="market-rank">{i+1}</span>{p.name}</td><td>{p.qty}</td><td>{money(p.total)}</td></tr>)}</tbody></table></div> : <Empty label="No product sales recorded this month yet."/>}</section>
            <section className="market-panel"><div className="market-panel-head"><div><h2>Low Stock Alert</h2><p>{lowStock.length} products need attention</p></div><CircleAlert size={18} className="market-warning-icon"/></div>{lowStock.length ? <div className="market-table-scroll"><table className="market-table"><thead><tr><th>Product</th><th>Stock</th><th>Status</th></tr></thead><tbody>{lowStock.slice(0,6).map(p=><tr key={p.sku}><td>{p.name}</td><td>{p.stock}</td><td><span className="market-stock-badge">{p.stock===0?"Out of stock":"Low"}</span></td></tr>)}</tbody></table></div> : <Empty label="All active products are above their low-stock thresholds."/>}{canSeeCosts && <Link className="market-panel-link" href="/inventory">View inventory →</Link>}</section>
          </div>
          <section className="market-panel market-recent"><div className="market-panel-head"><div><h2>Recent Transactions</h2><p>Latest recorded supermarket sales</p></div><Receipt size={18}/></div>{sales.length ? <div className="market-table-scroll"><table className="market-table"><thead><tr><th>Receipt</th><th>Cashier</th><th>Date</th><th>Amount</th></tr></thead><tbody>{sales.slice(0,6).map(s=><tr key={s.receiptNumber}><td><strong>{s.receiptNumber}</strong></td><td>{s.cashierName}</td><td>{dateLabel(new Date(s.createdAt))}</td><td><strong>{money(s.totalKobo)}</strong></td></tr>)}</tbody></table></div> : <Empty label="No transactions recorded yet. Open POS to create your first sale."/>}</section>
          <p className="market-footer">Marketline · Real store records only · Currency: Nigerian Naira (₦)</p>
        </div>
      </main>
    </div>
  );
}
function Metric({icon,label,value,sub,tone}:{icon:React.ReactNode;label:string;value:string;sub:string;tone:string}) { return <div className={`market-metric ${tone}`}><div className="market-metric-top"><span>{label}</span>{icon}</div><strong>{value}</strong><small>{sub}</small><div className="market-metric-glow"/></div>; }
function Empty({label}:{label:string}) {return <div className="market-empty"><Search size={23}/><p>{label}</p></div>;}
