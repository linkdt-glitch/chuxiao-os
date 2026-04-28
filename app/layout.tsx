import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "初晓 OS 系统",
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
