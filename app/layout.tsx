import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kairosmini OS",
  description: "AI native company operating system foundation",
  icons: {
    icon: "/brand/kairosmini-mark.png",
    apple: "/brand/kairosmini-mark.png"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
