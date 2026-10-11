"use client";

import { useRef, useState, type FormEvent } from "react";
import { ArrowLeft, LoaderCircle, PackagePlus, Search, ShoppingBasket } from "lucide-react";
import Link from "next/link";

type ProductRow = {
  id: string;
  name: string;
  category: string;
  sku: string;
  sellingPriceNgn: number;
  costPriceNgn?: number;
  stock: number;
  minimumStock: number;
  unit: string;
  imageUrl?: string;
};

const money = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 2 });

export function InventoryManager({ canViewCost, initialProducts }: { canViewCost: boolean; initialProducts: ProductRow[] }) {
  const productNameInput = useRef<HTMLInputElement>(null);
  const [products, setProducts] = useState<ProductRow[]>(initialProducts);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function loadProducts(query = search) {
    setLoading(true);
    try {
      const response = await fetch(`/api/products?q=${encodeURIComponent(query)}&limit=100`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Products could not be loaded.");
      setProducts(result.items);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Products could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const form = event.currentTarget;
    const data = new FormData(form);
    const body = {
      name: data.get("name"), category: data.get("category"), sku: data.get("sku"),
      sellingPriceNgn: Number(data.get("sellingPriceNgn")), stock: Number(data.get("stock")),
      minimumStock: Number(data.get("minimumStock")), unit: data.get("unit"),
      imageUrl: data.get("imageUrl"), description: data.get("description"), barcode: data.get("barcode"),
      ...(canViewCost ? {costPriceNgn: Number(data.get("costPriceNgn") || 0)} : {}),
    };
    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Product could not be saved.");
      form.reset();
      await loadProducts("");
      setMessage("Product added.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Product could not be saved.");
    } finally {
      setPending(false);
    }
  }

  async function adjustStock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/inventory/movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: data.get("productId"), quantityDelta: Number(data.get("quantityDelta")), reason: data.get("reason") }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Stock could not be adjusted.");
      (event.currentTarget as HTMLFormElement).reset();
      await loadProducts();
      setMessage(`Stock updated. New quantity: ${result.stock}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Stock could not be adjusted.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="inventory-page">
      
      <section className="inventory-content">
        <div className="inventory-heading"><div><p className="eyebrow">CATALOGUE & STOCK</p><h1>Inventory</h1><p>Products are stored in the supermarket database and shared across staff.</p></div><span className="inventory-count">{products.length} shown</span></div>

        <div className="inventory-tools">
          <form className="inventory-search" onSubmit={(event) => { event.preventDefault(); void loadProducts(); }}>
            <Search size={17} aria-hidden="true" />
            <input aria-label="Search products" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, SKU or barcode" />
            <button type="submit">Search</button>
          </form>
          <form className="product-form" onSubmit={handleCreate}>
            <h2><PackagePlus size={18} /> Add product</h2>
            <div className="form-grid">
              <label>Product name<input ref={productNameInput} name="name" minLength={2} maxLength={160} required /></label>
              <label>Category<input name="category" placeholder="Rice and grains" maxLength={80} required /></label>
              <label>SKU<input name="sku" maxLength={64} required /></label>
              <label>Selling price (₦)<input name="sellingPriceNgn" type="number" min="0.01" step="0.01" required /></label>
              <label>Opening stock<input name="stock" type="number" min="0" step="1" defaultValue="0" required /></label>
              <label>Low-stock threshold<input name="minimumStock" type="number" min="0" step="1" defaultValue="5" required /></label>
              <label>Barcode<input name="barcode" maxLength={80} placeholder="Barcode number" /></label>
              <label>Product image HTTPS URL<input name="imageUrl" type="url" placeholder="https://example.com/product.jpg" /></label>
              <label>Description<input name="description" maxLength={2000} placeholder="Size, brand and packaging" /></label>
              {canViewCost && <label>Cost price (₦)<input name="costPriceNgn" type="number" min="0" step=".01" defaultValue="0" /></label>}
              <label>Unit<select name="unit" defaultValue="unit"><option value="unit">Unit</option><option value="kg">Kilogram</option><option value="g">Gram</option><option value="litre">Litre</option><option value="pack">Pack</option><option value="carton">Carton</option><option value="bottle">Bottle</option><option value="bag">Bag</option></select></label>
            </div>
            <div className="form-actions"><p role="status">{message}</p><button className="submit-button" type="submit" disabled={pending}>{pending ? "Saving…" : "Add product"}</button></div>
          </form>
          <form className="adjustment-form" onSubmit={adjustStock}>
            <h2>Record stock movement</h2>
            <div className="adjustment-grid">
              <label>Product<select name="productId" required defaultValue=""><option value="" disabled>Select product</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name} ({product.stock} {product.unit})</option>)}</select></label>
              <label>Change in units<input name="quantityDelta" type="number" step="1" required placeholder="+10 or -2" /></label>
              <label>Reason<input name="reason" minLength={3} maxLength={300} required placeholder="Delivery received" /></label>
              <button type="submit" disabled={pending}>Save adjustment</button>
            </div>
            <p className="form-hint">Use a positive quantity to restock and a negative quantity to record a reduction. Stock cannot go below zero.</p>
          </form>
        </div>

        <div className="inventory-table-wrap">
          <table className="inventory-table">
            <thead><tr><th>Product</th><th>SKU</th><th>Category</th><th>Selling price</th>{canViewCost && <th>Cost</th>}<th>Stock</th><th>Status</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={canViewCost ? 7 : 6} className="table-state"><LoaderCircle className="spin" size={18} /> Loading products</td></tr> : products.length === 0 ? <tr><td colSpan={canViewCost ? 7 : 6} className="table-state"><div className="inventory-empty"><strong>{message || "No products yet"}</strong><span>{message ? "Check your connection and retry a product search." : "Add your first product to start managing stock."}</span>{!message && <button className="empty-add-button" type="button" onClick={() => productNameInput.current?.focus()}>Add Product</button>}</div></td></tr> : products.map((product) => (
                <tr key={product.id}><td className="product-name-cell"><span style={{display:"inline-flex",alignItems:"center",gap:10}}>{product.imageUrl && <img src={product.imageUrl} alt="" width={40} height={40} style={{objectFit:"cover",borderRadius:7}}/>}{product.name}</span></td><td>{product.sku}</td><td>{product.category}</td><td>{money.format(product.sellingPriceNgn)}</td>{canViewCost && <td>{product.costPriceNgn === undefined ? "—" : money.format(product.costPriceNgn)}</td>}<td>{product.stock} <span className="unit-label">{product.unit}</span></td><td><span className={`stock-status ${product.stock === 0 ? "out" : product.stock <= product.minimumStock ? "low" : "in"}`}>{product.stock === 0 ? "Out of stock" : product.stock <= product.minimumStock ? "Low stock" : "In stock"}</span></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}