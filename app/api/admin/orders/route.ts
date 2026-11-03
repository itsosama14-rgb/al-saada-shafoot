import { NextResponse } from "next/server";
import { getOrder, listOrders, saveOrder, type OrderStatus } from "@/lib/orders-store";

export const runtime = "nodejs";
const allowed: OrderStatus[] = ["new", "preparing", "ready", "delivering", "completed", "cancelled"];

function authorized(request: Request) {
  const password = process.env.ADMIN_PASSWORD;
  return Boolean(password && request.headers.get("x-admin-password") === password);
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "كلمة المرور غير صحيحة." }, { status: 401 });
  try { return NextResponse.json({ orders: await listOrders() }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "تعذر تحميل الطلبات." }, { status: 503 }); }
}

export async function PATCH(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "كلمة المرور غير صحيحة." }, { status: 401 });
  try {
    const { reference, status } = await request.json();
    if (typeof reference !== "string" || !allowed.includes(status)) return NextResponse.json({ error: "بيانات التحديث غير صحيحة." }, { status: 400 });
    const order = await getOrder(reference);
    if (!order) return NextResponse.json({ error: "الطلب غير موجود." }, { status: 404 });
    order.status = status as OrderStatus;
    order.updatedAt = new Date().toISOString();
    await saveOrder(order);
    return NextResponse.json({ order });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "تعذر تحديث الطلب." }, { status: 503 }); }
}
