import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "قاعدة البيانات غير مربوطة بعد. أضف DATABASE_URL في إعدادات البيئة." }, { status: 503 });
  try {
    const body = await request.json();
    const { name, phone, address, type, notes, items } = body;
    if (typeof name !== "string" || name.trim().length < 2 || typeof phone !== "string" || phone.trim().length < 7)
      return NextResponse.json({ error: "يرجى إدخال الاسم ورقم هاتف صحيح." }, { status: 400 });
    if (!["delivery", "pickup"].includes(type) || (type === "delivery" && (typeof address !== "string" || !address.trim())))
      return NextResponse.json({ error: "يرجى تحديد طريقة الاستلام والعنوان." }, { status: 400 });
    if (!Array.isArray(items) || items.length < 1 || items.length > 30)
      return NextResponse.json({ error: "السلة فارغة أو تحتوي على عناصر كثيرة." }, { status: 400 });
    const sql = neon(process.env.DATABASE_URL);
    const ids = items.map((i: { menuItemId: number }) => Number(i.menuItemId));
    if (ids.some((id: number) => !Number.isInteger(id) || id < 1)) return NextResponse.json({ error: "عنصر غير صالح." }, { status: 400 });
    const products = (await sql`SELECT id, name, price, is_available FROM menu_items WHERE id = ANY(${ids})`) as unknown as Array<{ id: number; name: string; price: number | string; is_available: boolean }>;
    const normalized = items.map((i: {menuItemId:number;quantity:number}) => {
      const product = products.find((p: { id: number; name: string; price: number | string; is_available: boolean }) => Number(p.id) === Number(i.menuItemId));
      const quantity = Number(i.quantity);
      if (!product || !product.is_available || !Number.isInteger(quantity) || quantity < 1 || quantity > 50) throw new Error("أحد المنتجات لم يعد متاحاً.");
      return { id: product.id, name: product.name, price: Number(product.price), quantity };
    });
    const subtotal = normalized.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const reference = "SA-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2,6).toUpperCase();
    const customer = await sql`INSERT INTO customers (name, phone) VALUES (${name.trim()}, ${phone.trim()}) RETURNING id`;
    const order = await sql`INSERT INTO orders (reference, customer_id, customer_name, phone, order_type, delivery_address, notes, subtotal, delivery_fee, total) VALUES (${reference}, ${customer[0].id}, ${name.trim()}, ${phone.trim()}, ${type}, ${type === "delivery" ? address.trim() : null}, ${typeof notes === "string" ? notes.slice(0,500) : null}, ${subtotal}, 0, ${subtotal}) RETURNING id`;
    for (const item of normalized) await sql`INSERT INTO order_items (order_id, menu_item_id, item_name, quantity, unit_price, line_total) VALUES (${order[0].id}, ${item.id}, ${item.name}, ${item.quantity}, ${item.price}, ${item.price * item.quantity})`;
    return NextResponse.json({ reference, status: "new" }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "تعذر حفظ الطلب." }, { status: 400 });
  }
}

export async function GET(request: Request) {
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "قاعدة البيانات غير مربوطة." }, { status: 503 });
  const { searchParams } = new URL(request.url);
  const reference = searchParams.get("reference");
  const phone = searchParams.get("phone");
  if (!reference && !phone) return NextResponse.json({ error: "أدخل الرقم المرجعي أو الهاتف." }, { status: 400 });
  const sql = neon(process.env.DATABASE_URL);
  const rows = reference
    ? await sql`SELECT reference, status, order_type, total, created_at FROM orders WHERE reference = ${reference.trim()} LIMIT 1`
    : await sql`SELECT reference, status, order_type, total, created_at FROM orders WHERE phone = ${phone!.trim()} ORDER BY created_at DESC LIMIT 10`;
  return NextResponse.json({ orders: rows });
}