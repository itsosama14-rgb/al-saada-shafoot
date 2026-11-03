import { NextResponse } from "next/server";
import { getOrder, listOrders, redisCommand, saveOrder, type StoredOrder } from "@/lib/orders-store";

export const runtime = "nodejs";
const menu = [
  { id: 1, name: "وجبة شاورما عربي", price: 22 },
  { id: 2, name: "ساندويش شاورما", price: 12 },
  { id: 3, name: "وجبة بروستد", price: 28 },
  { id: 4, name: "برغر لحم", price: 24 },
  { id: 5, name: "بطاطا مقلية", price: 8 },
  { id: 6, name: "مشروب غازي", price: 5 },
];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, phone, address, type, notes, items } = body;
    if (typeof name !== "string" || name.trim().length < 2 || typeof phone !== "string" || phone.trim().length < 7)
      return NextResponse.json({ error: "يرجى إدخال الاسم ورقم هاتف صحيح." }, { status: 400 });
    if (!["delivery", "pickup"].includes(type) || (type === "delivery" && (typeof address !== "string" || !address.trim())))
      return NextResponse.json({ error: "يرجى تحديد طريقة الاستلام والعنوان." }, { status: 400 });
    if (!Array.isArray(items) || items.length < 1 || items.length > 30)
      return NextResponse.json({ error: "السلة فارغة أو تحتوي على عناصر كثيرة." }, { status: 400 });
    const normalized = items.map((item: { menuItemId: number; quantity: number }) => {
      const product = menu.find(p => p.id === Number(item.menuItemId));
      const quantity = Number(item.quantity);
      if (!product) throw new Error("أحد المنتجات غير موجود في القائمة.");
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 50) throw new Error("كمية أحد المنتجات غير صحيحة.");
      return { id: product.id, name: product.name, price: product.price, quantity };
    });
    const total = normalized.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const sequence = await redisCommand<number>("INCR", "orders:sequence");
    const reference = "SA-" + String(sequence).padStart(5, "0");
    const now = new Date().toISOString();
    const order: StoredOrder = {
      reference, name: name.trim(), phone: phone.trim(),
      address: type === "delivery" ? address.trim() : "",
      type, notes: typeof notes === "string" ? notes.slice(0, 500) : "",
      items: normalized, total, status: "new", createdAt: now, updatedAt: now,
    };
    await saveOrder(order);
    await redisCommand("LPUSH", "orders:index", reference);
    return NextResponse.json({ reference, status: order.status }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "تعذر حفظ الطلب." }, { status: 503 });
  }
}

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const reference = params.get("reference")?.trim();
    const phone = params.get("phone")?.trim();
    if (!reference && !phone) return NextResponse.json({ error: "أدخل الرقم المرجعي أو الهاتف." }, { status: 400 });
    if (reference) {
      const order = await getOrder(reference);
      if (!order) return NextResponse.json({ error: "لم نعثر على طلب بهذا الرقم." }, { status: 404 });
      return NextResponse.json({ orders: [order] });
    }
    const orders = await listOrders();
    return NextResponse.json({ orders: orders.filter(order => order.phone === phone).slice(0, 10) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "تعذر البحث عن الطلب." }, { status: 503 });
  }
}
