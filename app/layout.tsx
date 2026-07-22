import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VHB｜今晚点什么",
  description: "Vincent’s Homebar 今晚酒单与点单系统。主理人确认今日材料，每一杯都可以现在点。",
  icons: { icon: "/vhb-logo.png", shortcut: "/vhb-logo.png" },
  openGraph: {
    title: "VHB｜今晚点什么",
    description: "今晚酒单 · 实时点单",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", title: "VHB｜今晚点什么", description: "今晚酒单 · 实时点单", images: ["/og.png"] },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
