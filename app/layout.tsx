import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "مطعم السعادة شعفوط | مذاق يجمعنا",
  description: "اطلب أشهى الوجبات من مطعم السعادة شعفوط وتابع طلبك بسهولة.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ar" dir="rtl"><body>{children}</body></html>;
}