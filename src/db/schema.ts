import { pgTable, uuid, varchar, text, boolean, integer, bigint, timestamp, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";

const id = () => uuid("id").defaultRandom().primaryKey();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

export const users = pgTable("users", {
  id: id(), name: varchar("name", { length: 120 }).notNull(),
  email: varchar("email", { length: 254 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: varchar("role", { length: 16 }).notNull().default("cashier"),
  active: boolean("active").notNull().default(true),
  monthlySalaryKobo: bigint("monthly_salary_kobo", { mode: "number" }).notNull().default(0),
  salaryPaidThrough: varchar("salary_paid_through", { length: 7 }).notNull().default(""),
  createdAt: createdAt(), updatedAt: updatedAt(),
});

export const sessions = pgTable("sessions", {
  id: id(), userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: createdAt(),
}, (t) => [index("sessions_user_idx").on(t.userId), index("sessions_expiry_idx").on(t.expiresAt)]);

export const categories = pgTable("categories", {
  id: id(), name: varchar("name", { length: 80 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(), updatedAt: updatedAt(),
});

export const products = pgTable("products", {
  id: id(), categoryId: uuid("category_id").notNull().references(() => categories.id),
  name: varchar("name", { length: 160 }).notNull(),
  description: text("description").notNull().default(""),
  sku: varchar("sku", { length: 64 }).notNull().unique(),
  barcode: varchar("barcode", { length: 80 }).unique(),
  sellingPriceKobo: bigint("selling_price_kobo", { mode: "number" }).notNull(),
  costPriceKobo: bigint("cost_price_kobo", { mode: "number" }).notNull().default(0),
  stock: integer("stock").notNull().default(0),
  minimumStock: integer("minimum_stock").notNull().default(5),
  unit: varchar("unit", { length: 24 }).notNull().default("unit"),
  imageUrl: text("image_url").notNull().default(""),
  unitSize: integer("unit_size").notNull().default(1),
  unitSizeLabel: varchar("unit_size_label", { length: 24 }).notNull().default("unit"),
  unitsPerPack: integer("units_per_pack").notNull().default(1),
  status: varchar("status", { length: 16 }).notNull().default("active"),
  createdAt: createdAt(), updatedAt: updatedAt(),
}, (t) => [index("products_status_category_idx").on(t.status, t.categoryId), index("products_name_idx").on(t.name)]);

export const customers = pgTable("customers", {
  id: id(), name: varchar("name", { length: 120 }).notNull(),
  email: varchar("email", { length: 254 }).notNull().default(""),
  phone: varchar("phone", { length: 30 }).notNull().default(""),
  address: varchar("address", { length: 300 }).notNull().default(""),
  active: boolean("active").notNull().default(true), createdAt: createdAt(), updatedAt: updatedAt(),
});

export const suppliers = pgTable("suppliers", {
  id: id(), name: varchar("name", { length: 120 }).notNull(),
  email: varchar("email", { length: 254 }).notNull().default(""),
  phone: varchar("phone", { length: 30 }).notNull().default(""),
  address: varchar("address", { length: 300 }).notNull().default(""),
  active: boolean("active").notNull().default(true), createdAt: createdAt(), updatedAt: updatedAt(),
});

export const branches = pgTable("branches", {
  id: id(), name: varchar("name", { length: 120 }).notNull(),
  address: varchar("address", { length: 300 }).notNull(),
  phone: varchar("phone", { length: 30 }).notNull().default(""),
  active: boolean("active").notNull().default(true), createdAt: createdAt(), updatedAt: updatedAt(),
});

export const purchases = pgTable("purchases", {
  id: id(), supplierName: varchar("supplier_name", { length: 120 }).notNull(),
  reference: varchar("reference", { length: 80 }).notNull(),
  description: varchar("description", { length: 300 }).notNull(),
  amountKobo: bigint("amount_kobo", { mode: "number" }).notNull(),
  status: varchar("status", { length: 16 }).notNull().default("pending"),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  createdAt: createdAt(), updatedAt: updatedAt(),
});

export const expenses = pgTable("expenses", {
  id: id(), description: varchar("description", { length: 300 }).notNull(),
  category: varchar("category", { length: 80 }).notNull(),
  amountKobo: bigint("amount_kobo", { mode: "number" }).notNull(),
  date: timestamp("date", { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  createdAt: createdAt(), updatedAt: updatedAt(),
});

export const sales = pgTable("sales", {
  id: id(), receiptNumber: varchar("receipt_number", { length: 100 }).notNull().unique(),
  idempotencyKey: varchar("idempotency_key", { length: 150 }).notNull().unique(),
  cashierId: uuid("cashier_id").notNull().references(() => users.id),
  cashierName: varchar("cashier_name", { length: 120 }).notNull(),
  customer: jsonb("customer").notNull().default({}),
  totalKobo: bigint("total_kobo", { mode: "number" }).notNull(),
  paymentStatus: varchar("payment_status", { length: 32 }).notNull().default("cashier_recorded"),
  createdAt: createdAt(), updatedAt: updatedAt(),
}, (t) => [index("sales_created_idx").on(t.createdAt), index("sales_cashier_idx").on(t.cashierId, t.createdAt)]);

export const saleItems = pgTable("sale_items", {
  id: id(), saleId: uuid("sale_id").notNull().references(() => sales.id),
  productId: uuid("product_id").notNull().references(() => products.id),
  name: varchar("name", { length: 160 }).notNull(),
  sku: varchar("sku", { length: 64 }).notNull(),
  unit: varchar("unit", { length: 24 }).notNull(),
  quantity: integer("quantity").notNull(),
  unitPriceKobo: bigint("unit_price_kobo", { mode: "number" }).notNull(),
  subtotalKobo: bigint("subtotal_kobo", { mode: "number" }).notNull(),
}, (t) => [index("sale_items_sale_idx").on(t.saleId)]);

export const salePayments = pgTable("sale_payments", {
  id: id(), saleId: uuid("sale_id").notNull().references(() => sales.id),
  method: varchar("method", { length: 32 }).notNull(),
  amountKobo: bigint("amount_kobo", { mode: "number" }).notNull(),
  status: varchar("status", { length: 32 }).notNull().default("cashier_recorded"),
  recordedBy: uuid("recorded_by").notNull().references(() => users.id),
}, (t) => [index("sale_payments_sale_idx").on(t.saleId)]);

export const inventoryMovements = pgTable("inventory_movements", {
  id: id(), productId: uuid("product_id").notNull().references(() => products.id),
  actorId: uuid("actor_id").notNull().references(() => users.id),
  type: varchar("type", { length: 20 }).notNull(),
  quantityDelta: integer("quantity_delta").notNull(),
  stockBefore: integer("stock_before").notNull(),
  stockAfter: integer("stock_after").notNull(),
  reason: varchar("reason", { length: 300 }).notNull().default(""),
  saleId: uuid("sale_id").references(() => sales.id),
  createdAt: createdAt(),
}, (t) => [index("inventory_movements_product_idx").on(t.productId), index("inventory_movements_created_idx").on(t.createdAt)]);
