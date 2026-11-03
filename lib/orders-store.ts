const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

export async function redisCommand<T = unknown>(...command: (string | number)[]): Promise<T> {
  if (!redisUrl || !redisToken) throw new Error("خدمة حفظ الطلبات غير مربوطة. أضف متغيرات Upstash في إعدادات Vercel.");
  const response = await fetch(redisUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${redisToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("تعذر الاتصال بخدمة حفظ الطلبات.");
  const payload = await response.json();
  if (payload.error) throw new Error("تعذر تنفيذ عملية حفظ الطلب.");
  return payload.result as T;
}

export type OrderStatus = "new" | "preparing" | "ready" | "delivering" | "completed" | "cancelled";
export type StoredOrder = {
  reference: string; name: string; phone: string; address: string; type: "delivery" | "pickup";
  notes: string; items: { id: number; name: string; price: number; quantity: number }[];
  total: number; status: OrderStatus; createdAt: string; updatedAt: string;
};

export async function getOrder(reference: string): Promise<StoredOrder | null> {
  return redisCommand<StoredOrder | null>("GET", `order:${reference}`).then(value =>
    typeof value === "string" ? JSON.parse(value) as StoredOrder : value
  );
}

export async function listOrders(): Promise<StoredOrder[]> {
  const refs = await redisCommand<string[]>("LRANGE", "orders:index", "0", "99");
  if (!Array.isArray(refs) || refs.length === 0) return [];
  const values = await Promise.all(refs.map(ref => getOrder(ref)));
  return values.filter((order): order is StoredOrder => Boolean(order));
}

export async function saveOrder(order: StoredOrder): Promise<void> {
  await redisCommand("SET", `order:${order.reference}`, JSON.stringify(order));
}
