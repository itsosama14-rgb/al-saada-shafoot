import { NextResponse } from "next/server";
import { getCategories, getMenu, saveCategories, saveMenu, type MenuItem } from "@/lib/menu-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const password = process.env.ADMIN_PASSWORD;
  return Boolean(password && request.headers.get("x-admin-password") === password);
}
function cleanItem(body: any, id: number): MenuItem | null {
  if (typeof body?.name !== "string" || !body.name.trim() ||
      typeof body?.category !== "string" || !body.category.trim() ||
      !Number.isFinite(Number(body?.price)) || Number(body.price) < 0 ||
      typeof body?.image !== "string" || !/^https?:\/\//i.test(body.image.trim())) return null;
  return {
    id, name: body.name.trim().slice(0, 100),
    description: typeof body.description === "string" ? body.description.trim().slice(0, 300) : "",
    price: Math.round(Number(body.price) * 100) / 100,
    image: body.image.trim(), category: body.category.trim().slice(0, 60),
    tag: typeof body.tag === "string" ? body.tag.trim().slice(0, 40) : "",
    available: body.available !== false
  };
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "كلمة المرور غير صحيحة." }, { status: 401 });
  try {
    const [items, categories] = await Promise.all([getMenu(), getCategories()]);
    return NextResponse.json({ items, categories });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "تعذر تحميل المنيو." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "كلمة المرور غير صحيحة." }, { status: 401 });
  try {
    const body = await request.json();
    if (body?.action === "add-category") {
      const category = typeof body.category === "string" ? body.category.trim() : "";
      if (!category || category.length > 60) return NextResponse.json({ error: "اسم القسم غير صحيح." }, { status: 400 });
      const categories = await getCategories();
      if (categories.includes(category)) return NextResponse.json({ error: "هذا القسم موجود مسبقاً." }, { status: 409 });
      categories.push(category);
      await saveCategories(categories);
      return NextResponse.json({ categories }, { status: 201 });
    }
    const items = await getMenu();
    const nextId = Math.max(0, ...items.map(item => item.id)) + 1;
    const item = cleanItem(body, nextId);
    if (!item) return NextResponse.json({ error: "تحقق من الاسم والسعر والقسم ورابط الصورة (يجب أن يبدأ بـ https://)." }, { status: 400 });
    items.unshift(item);
    await saveMenu(items);
    const categories = await getCategories();
    if (!categories.includes(item.category)) await saveCategories([...categories, item.category]);
    return NextResponse.json({ item, items }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "تعذر إضافة الصنف." }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "كلمة المرور غير صحيحة." }, { status: 401 });
  try {
    const body = await request.json();
    if (body?.action === "rename-category") {
      const oldCategory = typeof body.oldCategory === "string" ? body.oldCategory.trim() : "";
      const newCategory = typeof body.newCategory === "string" ? body.newCategory.trim() : "";
      if (!oldCategory || !newCategory || newCategory.length > 60) return NextResponse.json({ error: "اسم القسم الجديد غير صحيح." }, { status: 400 });
      const categories = await getCategories();
      if (!categories.includes(oldCategory)) return NextResponse.json({ error: "القسم غير موجود." }, { status: 404 });
      if (categories.includes(newCategory)) return NextResponse.json({ error: "يوجد قسم بهذا الاسم بالفعل." }, { status: 409 });
      const items = await getMenu();
      await saveMenu(items.map(item => item.category === oldCategory ? { ...item, category: newCategory } : item));
      await saveCategories(categories.map(category => category === oldCategory ? newCategory : category));
      return NextResponse.json({ categories: categories.map(category => category === oldCategory ? newCategory : category), items: items.map(item => item.category === oldCategory ? { ...item, category: newCategory } : item) });
    }
    const id = Number(body?.id);
    if (!Number.isInteger(id)) return NextResponse.json({ error: "رقم الصنف غير صحيح." }, { status: 400 });
    const items = await getMenu();
    const index = items.findIndex(item => item.id === id);
    if (index < 0) return NextResponse.json({ error: "الصنف غير موجود." }, { status: 404 });
    const item = cleanItem(body, id);
    if (!item) return NextResponse.json({ error: "تحقق من الاسم والسعر والقسم ورابط الصورة." }, { status: 400 });
    items[index] = item;
    await saveMenu(items);
    const categories = await getCategories();
    if (!categories.includes(item.category)) await saveCategories([...categories, item.category]);
    return NextResponse.json({ item, items });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "تعذر حفظ التعديلات." }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "كلمة المرور غير صحيحة." }, { status: 401 });
  try {
    const body = await request.json();
    if (body?.action === "delete-category") {
      const category = typeof body.category === "string" ? body.category.trim() : "";
      const items = await getMenu();
      if (items.some(item => item.category === category)) return NextResponse.json({ error: "لا يمكن حذف قسم يحتوي على أصناف. انقل الأصناف إلى قسم آخر أولاً." }, { status: 409 });
      const categories = (await getCategories()).filter(value => value !== category);
      await saveCategories(categories);
      return NextResponse.json({ categories });
    }
    const id = Number(body?.id);
    const items = await getMenu();
    const filtered = items.filter(item => item.id !== id);
    if (filtered.length === items.length) return NextResponse.json({ error: "الصنف غير موجود." }, { status: 404 });
    await saveMenu(filtered);
    return NextResponse.json({ items: filtered });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "تعذر حذف الصنف." }, { status: 503 });
  }
}
