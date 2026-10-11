import { redirect } from "next/navigation";
import { InventoryManager } from "@/components/inventory/inventory-manager";
import { getCurrentUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { Product } from "@/models/product";

type InventoryReadRecord = {
  _id: unknown;
  name: string;
  category: { name: string } | null;
  sku: string;
  sellingPriceKobo: number;
  costPriceKobo?: number;
  stock: number;
  minimumStock: number;
  unit: string;
};

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (user.role === "cashier") redirect("/access-denied");

  try {
  await connectToDatabase();
  const result = await Product.find({ status: "active" })
    .select(user.role === "owner" || user.role === "manager" ? "+costPriceKobo" : "-costPriceKobo")
    .populate<{ category: { name: string } }>("category", "name")
    .sort({ name: 1 })
    .limit(100)
    .lean();
  const records = result as unknown as InventoryReadRecord[];
  const products = records.map((product) => ({
    id: String(product._id),
    name: product.name,
    category: product.category?.name ?? "Uncategorised",
    sku: product.sku,
    sellingPriceNgn: product.sellingPriceKobo / 100,
    ...(user.role === "owner" || user.role === "manager" ? { costPriceNgn: product.costPriceKobo === undefined ? undefined : product.costPriceKobo / 100 } : {}),
    stock: product.stock,
    minimumStock: product.minimumStock,
    unit: product.unit,
  }));

  return <InventoryManager canViewCost={user.role === "owner" || user.role === "manager"} initialProducts={products} />;
  } catch {
    return <main className="inventory-page"><section className="inventory-error" role="alert"><h1>Inventory unavailable</h1><p>Products could not be loaded. Check the MongoDB connection and try again.</p><a href="/inventory">Retry inventory</a></section></main>;
  }
}