import type { Metadata, Viewport } from "next";
import { Header } from "@/components/layout/Header";
import { ConditionalFooter } from "@/components/layout/ConditionalFooter";
import "./globals.css";

const siteName = "AXION X";
const projectVersion = "AXION_X_6_8";
const siteDescription = "AXION X — интернет-магазин автозапчастей. Найдите деталь. Двигайтесь дальше.";

export const metadata: Metadata = {
  metadataBase: new URL("https://autoparts-market-six.vercel.app"),
  title: {
    default: "AXION X — автозапчасти",
    template: "%s | AXION X",
  },
  description: siteDescription,
  applicationName: projectVersion,
  icons: {
    icon: [{ url: "/brand/Graphics.png", type: "image/png", sizes: "1254x1254" }],
    shortcut: [{ url: "/brand/Graphics.png", type: "image/png" }],
    apple: [{ url: "/brand/Graphics.png", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName,
    title: "AXION X — автозапчасти",
    description: siteDescription,
    images: [{ url: "/axion-x-preview.png", width: 1254, height: 1254, alt: "Логотип AXION X" }],
  },
  twitter: {
    card: "summary",
    title: "AXION X — автозапчасти",
    description: siteDescription,
    images: ["/axion-x-preview.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#080b0e",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>
        <Header />
        <div className="pb-16 md:pb-0">{children}</div>
        <ConditionalFooter />
      </body>
    </html>
  );
}
