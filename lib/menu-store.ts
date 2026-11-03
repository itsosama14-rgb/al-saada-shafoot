import { redisCommand } from "@/lib/orders-store";

export type MenuItem = {
  id: number;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  tag?: string;
  available: boolean;
};

export const defaultMenu: MenuItem[] = [
  { id: 1, name: "وجبة شاورما عربي", description: "شرائح شاورما دجاج، ثومية، مخلل وبطاطا ذهبية", price: 22, image: "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=900&q=85", category: "الشاورما", tag: "الأكثر طلباً", available: true },
  { id: 2, name: "ساندويش شاورما", description: "خبز طازج محشو بالشاورما وصوصنا الخاص", price: 12, image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=900&q=85", category: "الشاورما", available: true },
  { id: 3, name: "وجبة بروستد", description: "دجاج مقرمش مع البطاطا والثومية", price: 28, image: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=900&q=85", category: "الوجبات", tag: "وجبة مميزة", available: true },
  { id: 4, name: "برغر لحم", description: "لحم مشوي، جبنة ذائبة، خس وصوص مميز", price: 24, image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=900&q=85", category: "الوجبات", available: true },
  { id: 5, name: "بطاطا مقلية", description: "بطاطا ذهبية مقرمشة تقدم ساخنة", price: 8, image: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=900&q=85", category: "المقبلات", available: true },
  { id: 6, name: "مشروب بارد", description: "مشروب منعش يكمّل وجبتك", price: 5, image: "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=900&q=85", category: "المشروبات", available: true }
];

const defaultCategories = ["الشاورما", "الوجبات", "المقبلات", "المشروبات"];

function parseArray<T>(value: unknown, fallback: T[]): T[] {
  if (typeof value === "string") {
    try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed as T[] : fallback; }
    catch { return fallback; }
  }
  return Array.isArray(value) ? value as T[] : fallback;
}

export async function getMenu(): Promise<MenuItem[]> {
  try {
    const value = await redisCommand<unknown>("GET", "menu:items");
    return parseArray<MenuItem>(value, defaultMenu).filter(item => item && Number.isInteger(item.id));
  } catch (error) {
    // Redis is configured alongside order storage. Keep the storefront readable if it is temporarily unavailable.
    return defaultMenu;
  }
}

export async function saveMenu(items: MenuItem[]): Promise<void> {
  await redisCommand("SET", "menu:items", JSON.stringify(items));
}

export async function getCategories(): Promise<string[]> {
  try {
    const value = await redisCommand<unknown>("GET", "menu:categories");
    if (value === null || value === undefined) return defaultCategories;
    const saved = parseArray<string>(value, defaultCategories);
    return [...new Set(saved)];
  } catch {
    return defaultCategories;
  }
}

export async function saveCategories(categories: string[]): Promise<void> {
  await redisCommand("SET", "menu:categories", JSON.stringify([...new Set(categories.map(x => x.trim()).filter(Boolean))]));
}
