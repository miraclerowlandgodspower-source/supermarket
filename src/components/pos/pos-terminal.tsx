"use client";

import { useState, type FormEvent } from "react";
import { ArrowLeft, Minus, Plus, Printer, Search, ShoppingBasket, Trash2 } from "lucide-react";
import Link from "next/link";

type Product = { id: string; name: string; category: string; sku: string; sellingPriceNgn: number; stock: number; unit: string; imageUrl?: string };
type CartItem = Product & { quantity: number };
type Receipt = {
  receiptNumber: string;
  cashierName: string;
  customer: { name?: string; email?: string; phone?: string };
  items: Array<{ name: string; sku: string; unit: string; quantity: number; unitPriceNgn: number; subtotalNgn: number }>;
  totalNgn: number;
  payments: Array<{ method: string; status: string }>;
  createdAt: string;
};

const money = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 2 });
const paymentLabels: Record<string, string> = { cash: "Cash", bank_transfer: "Bank transfer", pos_terminal: "POS terminal", other: "Other" };

export function PosTerminal({ cashierName }: { cashierName: string }) {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [customer, setCustomer] = useState({ name: "", email: "", phone: "" });
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [printFormat, setPrintFormat] = useState<"thermal" | "a4">("thermal");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState("");

  async function searchProducts(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setMessage("");
    try {
      const response = await fetch(`/api/products?q=${encodeURIComponent(query)}&limit=30`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Products could not be loaded.");
      setProducts(result.items);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Products could not be loaded.");
    }
  }

  function addProduct(product: Product) {
    setReceipt(null);
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          setMessage(`Only ${product.stock} ${product.unit} available for ${product.name}.`);
          return current;
        }
        return current.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      if (product.stock < 1) return current;
      return [...current, { ...product, quantity: 1 }];
    });
    setIdempotencyKey("");
  }

  function changeQuantity(productId: string, amount: number) {
    setReceipt(null);
    setCart((current) => current.flatMap((item) => {
      if (item.id !== productId) return [item];
      const quantity = item.quantity + amount;
      if (quantity < 1) return [];
      if (quantity > item.stock) {
        setMessage(`Only ${item.stock} ${item.unit} available for ${item.name}.`);
        return [item];
      }
      return [{ ...item, quantity }];
    }));
    setIdempotencyKey("");
  }

  const total = cart.reduce((sum, item) => sum + item.sellingPriceNgn * item.quantity, 0);

  async function completeCheckout() {
    if (!cart.length || pending) return;
    setPending(true);
    setMessage("");
    const key = idempotencyKey || crypto.randomUUID();
    setIdempotencyKey(key);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idempotencyKey: key,
          items: cart.map(({ id, quantity }) => ({ productId: id, quantity })),
          customer,
          paymentMethod,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Checkout could not be completed.");
      setReceipt(result.sale);
      setCart([]);
      setIdempotencyKey("");
      setMessage(result.duplicate ? "Existing sale recovered safely." : "Sale recorded.");
      await searchProducts();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Checkout could not be completed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="pos-page">
      
      <section className="pos-content">
        <div className="pos-heading"><div><p className="eyebrow">POINT OF SALE</p><h1>New sale</h1></div><p>Prices and stock are verified at checkout.</p></div>
        <div className="pos-layout">
          <section className="pos-catalogue no-print" aria-label="Product catalogue">
            <form className="inventory-search" onSubmit={searchProducts}><Search size={17} aria-hidden="true" /><input aria-label="Search products" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Product name, SKU or barcode" /><button type="submit">Find</button></form>
            <div className="pos-product-grid">
              {products.length ? products.map((product) => <button className="pos-product" type="button" key={product.id} onClick={() => addProduct(product)} disabled={product.stock < 1}>
                <span className="product-image-placeholder">{product.imageUrl ? <img src={product.imageUrl} alt="" width={54} height={54} style={{objectFit:"cover",borderRadius:8}}/> : <ShoppingBasket size={23} />}</span><span className="pos-product-name">{product.name}</span><span className="pos-product-meta">{product.stock} {product.unit} available</span><strong>{money.format(product.sellingPriceNgn)}</strong>
              </button>) : <p className="pos-empty">Search for a product to begin.</p>}
            </div>
          </section>

          <section className="pos-cart" aria-label="Current sale">
            <div className="pos-cart-heading"><div><p className="eyebrow">CURRENT SALE</p><h2>Cart <span>{cart.length}</span></h2></div>{cart.length > 0 && <button className="clear-cart-button" type="button" onClick={() => { setCart([]); setIdempotencyKey(""); }}>Clear</button>}</div>
            <div className="pos-cart-items">
              {cart.length ? cart.map((item) => <div className="pos-cart-item" key={item.id}>
                <div className="pos-cart-item-copy"><strong>{item.name}</strong><span>{money.format(item.sellingPriceNgn)} / {item.unit}</span></div>
                <div className="quantity-control"><button type="button" aria-label={`Decrease ${item.name}`} onClick={() => changeQuantity(item.id, -1)}><Minus size={13} /></button><span>{item.quantity}</span><button type="button" aria-label={`Increase ${item.name}`} onClick={() => changeQuantity(item.id, 1)}><Plus size={13} /></button></div>
                <strong className="pos-line-total">{money.format(item.sellingPriceNgn * item.quantity)}</strong><button className="remove-cart-item" type="button" aria-label={`Remove ${item.name}`} onClick={() => { setCart((current) => current.filter((entry) => entry.id !== item.id)); setIdempotencyKey(""); }}><Trash2 size={15} /></button>
              </div>) : <div className="pos-cart-empty"><ShoppingBasket size={24} /><p>Your sale is empty</p><span>Add products from search</span></div>}
            </div>
            <div className="pos-payment">
              <details className="customer-details">
                <summary>Customer details <span>Optional</span></summary>
                <div className="customer-fields">
                  <label>Name<input value={customer.name} onChange={(event) => setCustomer((current) => ({ ...current, name: event.target.value }))} maxLength={120} /></label>
                  <label>Email<input type="email" value={customer.email} onChange={(event) => setCustomer((current) => ({ ...current, email: event.target.value }))} maxLength={254} /></label>
                  <label>WhatsApp / phone<input type="tel" value={customer.phone} onChange={(event) => setCustomer((current) => ({ ...current, phone: event.target.value }))} maxLength={24} /></label>
                </div>
              </details>
              <label htmlFor="payment-method">Payment method</label>
              <select id="payment-method" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}><option value="cash">Cash</option><option value="bank_transfer">Bank transfer</option><option value="pos_terminal">POS terminal</option><option value="other">Other</option></select>
              <div className="pos-total-row"><span>Total</span><strong>{money.format(total)}</strong></div>
              <p className="payment-disclaimer">Recorded by cashier. Provider verification is not implied.</p>
              <button className="submit-button checkout-button" type="button" disabled={!cart.length || pending} onClick={completeCheckout}>{pending ? "Processing…" : "Record sale"}</button>
              {message && <p className="pos-message" role="status">{message}</p>}
            </div>
          </section>
        </div>

        {receipt && <section className={`pos-receipt ${printFormat}`} aria-label="Sale receipt">
          <header><div className="brand-lockup"><span className="brand-mark"><ShoppingBasket size={19} /></span><span>Marketline<span className="brand-period">.</span></span></div><p>Purchase receipt</p></header>
          <div className="receipt-meta"><span>Receipt <strong>{receipt.receiptNumber}</strong></span><span>{new Date(receipt.createdAt).toLocaleString("en-NG")}</span><span>Cashier <strong>{receipt.cashierName}</strong></span>{receipt.customer.name && <span>Customer <strong>{receipt.customer.name}</strong></span>}{receipt.customer.email && <span>{receipt.customer.email}</span>}{receipt.customer.phone && <span>{receipt.customer.phone}</span>}</div>
          <div className="receipt-lines">{receipt.items.map((item) => <div key={item.sku}><span>{item.name}<small>{item.quantity} × {money.format(item.unitPriceNgn)}</small></span><strong>{money.format(item.subtotalNgn)}</strong></div>)}</div>
          <div className="receipt-total"><span>Total</span><strong>{money.format(receipt.totalNgn)}</strong></div>
          <p className="receipt-status">Payment recorded · {paymentLabels[receipt.payments[0]?.method] ?? "Other"}. Not provider verified.</p>
          <div className="receipt-actions no-print"><label htmlFor="print-format">Print layout<select id="print-format" value={printFormat} onChange={(event) => setPrintFormat(event.target.value as "thermal" | "a4")}><option value="thermal">Thermal printer</option><option value="a4">A4 paper</option></select></label><button className="logout-button" type="button" onClick={() => window.print()}><Printer size={16} /> Print receipt</button></div>
        </section>}
      </section>
    </main>
  );
}