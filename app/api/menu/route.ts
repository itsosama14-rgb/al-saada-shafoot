import { NextResponse } from "next/server";
import { getCategories, getMenu } from "@/lib/menu-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [items, categories] = await Promise.all([getMenu(), getCategories()]);
    return NextResponse.json({ items: items.filter(item => item.available !== false), categories }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch {
    return NextResponse.json({ error: "تعذر تحميل قائمة الطعام." }, { status: 503 });
  }
}
